/**
 * This script prevents users from selecting and copying content from the web page.
 * It uses multiple methods for broad browser compatibility.
 */
document.addEventListener('DOMContentLoaded', function() {
  
  // Method 1: Disable text selection using CSS
  // This is the most direct method and works in modern browsers.
  const bodyStyle = document.body.style;
  bodyStyle.webkitUserSelect = 'none'; // For Safari
  bodyStyle.mozUserSelect = 'none';    // For Firefox
  bodyStyle.msUserSelect = 'none';     // For Internet Explorer/Edge
  bodyStyle.userSelect = 'none';       // Standard syntax

  // Method 2: Block events for more robust protection

  // Prevent the 'selectstart' event, which fires when a user begins to highlight text.
  document.addEventListener('selectstart', function(e) {
    e.preventDefault();
  });

  // Prevent the 'copy' event, which fires when a user tries to copy content (e.g., with Ctrl+C).
  document.addEventListener('copy', function(e) {
    e.preventDefault();
  });

  // Prevent the 'contextmenu' (right-click) event to disable the menu that contains the "Copy" option.
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
});