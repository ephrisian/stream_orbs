// Whatnot Chat Detective Script
// Run this in the browser console (F12) on a Whatnot page with active chat

console.log('🔍 WHATNOT CHAT DETECTIVE STARTING...');

// Test 1: Look for common chat patterns
console.log('\n📋 TEST 1: Scanning for elements containing "chat" or "message"...');
const chatElements = document.querySelectorAll('[class*="chat"], [id*="chat"], [class*="message"], [id*="message"]');
console.log(`Found ${chatElements.length} elements with chat/message in class or ID:`);
chatElements.forEach((el, i) => {
  console.log(`  ${i+1}. ${el.tagName} - class: "${el.className}" - id: "${el.id}" - text: "${el.textContent.substring(0, 50)}..."`);
});

// Test 2: Look for data attributes
console.log('\n🏷️ TEST 2: Scanning for data-testid attributes...');
const dataTestElements = document.querySelectorAll('[data-testid*="chat"], [data-testid*="message"], [data-testid*="comment"]');
console.log(`Found ${dataTestElements.length} elements with chat/message/comment in data-testid:`);
dataTestElements.forEach((el, i) => {
  console.log(`  ${i+1}. ${el.tagName} - data-testid: "${el.getAttribute('data-testid')}" - text: "${el.textContent.substring(0, 50)}..."`);
});

// Test 3: Look for lists that might contain messages
console.log('\n📝 TEST 3: Scanning for lists and containers...');
const listElements = document.querySelectorAll('ul, ol, div[role="list"], div[role="log"]');
console.log(`Found ${listElements.length} list-like elements:`);
listElements.forEach((el, i) => {
  const childCount = el.children.length;
  if (childCount > 2) {
    console.log(`  ${i+1}. ${el.tagName} - children: ${childCount} - class: "${el.className}" - sample text: "${el.textContent.substring(0, 100)}..."`);
  }
});

// Test 4: Look for text that looks like chat messages
console.log('\n💬 TEST 4: Scanning for chat-like text patterns...');
const allDivs = document.querySelectorAll('div, span, p');
let chatLikeCount = 0;
allDivs.forEach((el, i) => {
  const text = el.textContent?.trim();
  if (text && text.length > 5 && text.length < 200) {
    // Look for username: message pattern
    if (/^[a-zA-Z0-9_]{2,20}\s*[:：]\s*.+/.test(text)) {
      chatLikeCount++;
      if (chatLikeCount <= 10) { // Only show first 10
        console.log(`  Chat-like ${chatLikeCount}: "${text}"`);
        console.log(`    Element: ${el.tagName} - class: "${el.className}" - parent: ${el.parentElement?.tagName}`);
      }
    }
  }
});
console.log(`Total chat-like patterns found: ${chatLikeCount}`);

// Test 5: Look for recently changing content (likely live chat)
console.log('\n⏱️ TEST 5: Looking for containers that might have live updates...');
const potentialChatContainers = [];
document.querySelectorAll('div').forEach(div => {
  const children = div.children.length;
  const text = div.textContent?.trim();
  
  // Look for containers with multiple children and reasonable text length
  if (children > 3 && children < 100 && text && text.length > 50) {
    // Check if children look like individual messages
    const childTexts = Array.from(div.children).map(child => child.textContent?.trim()).filter(t => t && t.length > 5);
    if (childTexts.length >= 3) {
      potentialChatContainers.push({
        element: div,
        childCount: children,
        sampleTexts: childTexts.slice(0, 3)
      });
    }
  }
});

console.log(`Found ${potentialChatContainers.length} potential chat containers:`);
potentialChatContainers.slice(0, 5).forEach((container, i) => {
  console.log(`  ${i+1}. Container with ${container.childCount} children:`);
  console.log(`    Class: "${container.element.className}"`);
  console.log(`    Sample messages:`, container.sampleTexts);
});

console.log('\n✅ CHAT DETECTIVE COMPLETE!');
console.log('📋 Please copy this output and share it for analysis.');

// Return summary for easy copying
return {
  chatElements: chatElements.length,
  dataTestElements: dataTestElements.length,
  listElements: listElements.length,
  chatLikePatterns: chatLikeCount,
  potentialContainers: potentialChatContainers.length,
  summary: 'Run completed - see console output above'
};
