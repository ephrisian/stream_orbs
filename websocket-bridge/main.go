package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// Message types
type Message struct {
	Type      string                 `json:"type"`
	Source    string                 `json:"source"`
	Data      map[string]interface{} `json:"data"`
	Timestamp time.Time              `json:"timestamp"`
	ID        string                 `json:"id"`
}

type ChatMessage struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Text      string `json:"text"`
	Timestamp string `json:"timestamp"`
	Platform  string `json:"platform"`
	Source    string `json:"source"`
}

type Client struct {
	ID     string
	Type   string // "extension" or "admin"
	Conn   *websocket.Conn
	Send   chan Message
	UUID   string
	LastSeen time.Time
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan Message
	register   chan *Client
	unregister chan *Client
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from localhost
		origin := r.Header.Get("Origin")
		return origin == "http://localhost:5173" || 
			   origin == "http://localhost:3001" ||
			   origin == "" // Allow extension connections
	},
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("Client registered: %s (%s) - UUID: %s", client.ID, client.Type, client.UUID)
			
			// Send welcome message
			welcome := Message{
				Type:      "connection",
				Source:    "server",
				Data:      map[string]interface{}{"status": "connected", "clientType": client.Type},
				Timestamp: time.Now(),
				ID:        generateID(),
			}
			
			select {
			case client.Send <- welcome:
			default:
				close(client.Send)
				delete(h.clients, client)
			}
			
			// Broadcast client count update
			h.broadcastClientCount()

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				log.Printf("Client unregistered: %s (%s)", client.ID, client.Type)
				h.broadcastClientCount()
			}

		case message := <-h.broadcast:
			log.Printf("Broadcasting message: %s from %s", message.Type, message.Source)
			
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
		}
	}
}

func (h *Hub) broadcastClientCount() {
	extensionCount := 0
	adminCount := 0
	
	for client := range h.clients {
		if client.Type == "extension" {
			extensionCount++
		} else if client.Type == "admin" {
			adminCount++
		}
	}
	
	statusMsg := Message{
		Type:   "status",
		Source: "server",
		Data: map[string]interface{}{
			"extensionClients": extensionCount,
			"adminClients":     adminCount,
			"totalClients":     len(h.clients),
		},
		Timestamp: time.Now(),
		ID:        generateID(),
	}
	
	h.broadcast <- statusMsg
}

func generateID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(6)
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}

func handleWebSocket(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	clientType := r.URL.Query().Get("type")
	if clientType == "" {
		clientType = "unknown"
	}
	
	clientUUID := r.URL.Query().Get("uuid")
	if clientUUID == "" {
		clientUUID = generateID()
	}

	client := &Client{
		ID:       generateID(),
		Type:     clientType,
		Conn:     conn,
		Send:     make(chan Message, 256),
		UUID:     clientUUID,
		LastSeen: time.Now(),
	}

	hub.register <- client

	// Start goroutines for reading and writing
	go client.writePump(hub)
	go client.readPump(hub)
}

func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		c.LastSeen = time.Now()
		return nil
	})

	for {
		var message Message
		err := c.Conn.ReadJSON(&message)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		message.Timestamp = time.Now()
		message.Source = c.Type + "-" + c.ID
		c.LastSeen = time.Now()

		log.Printf("Received message: %s from %s (%s)", message.Type, c.Type, c.ID)

		// Handle different message types
		switch message.Type {
		case "chat":
			// Forward chat messages to all clients
			hub.broadcast <- message
		case "ping":
			// Respond to ping
			pong := Message{
				Type:      "pong",
				Source:    "server",
				Data:      map[string]interface{}{"clientId": c.ID, "timestamp": time.Now()},
				Timestamp: time.Now(),
				ID:        generateID(),
			}
			select {
			case c.Send <- pong:
			default:
			}
		case "test":
			// Handle test messages
			hub.broadcast <- message
		default:
			// Forward other messages
			hub.broadcast <- message
		}
	}
}

func (c *Client) writePump(hub *Hub) {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteJSON(message); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func handleStatus(hub *Hub, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	extensionCount := 0
	adminCount := 0
	clients := make([]map[string]interface{}, 0)
	
	for client := range hub.clients {
		if client.Type == "extension" {
			extensionCount++
		} else if client.Type == "admin" {
			adminCount++
		}
		
		clients = append(clients, map[string]interface{}{
			"id":       client.ID,
			"type":     client.Type,
			"uuid":     client.UUID,
			"lastSeen": client.LastSeen,
		})
	}
	
	status := map[string]interface{}{
		"extensionClients": extensionCount,
		"adminClients":     adminCount,
		"totalClients":     len(hub.clients),
		"clients":          clients,
		"serverTime":       time.Now(),
	}
	
	json.NewEncoder(w).Encode(status)
}

func main() {
	hub := newHub()
	go hub.run()

	// WebSocket endpoint
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(hub, w, r)
	})
	
	// Status endpoint
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		handleStatus(hub, w, r)
	})
	
	// Health endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Println("WebSocket bridge server starting on :8080")
	log.Println("WebSocket endpoint: ws://localhost:8080/ws")
	log.Println("Status endpoint: http://localhost:8080/status")
	
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
