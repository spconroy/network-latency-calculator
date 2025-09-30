# WordPress Iframe Integration Instructions

This calculator is designed to work seamlessly when embedded as an iframe in WordPress. The iframe will automatically resize based on the calculator's content height.

## Step 1: Embed the iframe in WordPress

Add this HTML to your WordPress page (using a Custom HTML block):

```html
<iframe
  id="network-calculator-iframe"
  src="https://your-deployed-url.com"
  style="width: 100%; border: none; min-height: 600px;"
  scrolling="no"
  title="Network Latency Calculator">
</iframe>
```

Replace `https://your-deployed-url.com` with your actual deployed calculator URL.

## Step 2: Add the resize listener script

Add this JavaScript code to your WordPress page. You can add it in several ways:

### Option A: Custom HTML Block (Recommended)
Add a Custom HTML block below your iframe and paste this code:

```html
<script>
window.addEventListener('message', function(e) {
    // Check if the message is a resize request
    if (e.data && e.data.type === 'resize') {
        const iframe = document.querySelector('#network-calculator-iframe');
        if (iframe && e.data.height) {
            // Add 20px buffer for smooth scrolling
            iframe.style.height = (e.data.height + 20) + 'px';
        }
    }
});
</script>
```

### Option B: Add to Theme (Advanced)
If you want this to work site-wide, add this to your theme's footer.php or use a plugin like "Insert Headers and Footers":

```javascript
<script>
(function() {
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'resize') {
            const iframe = document.querySelector('#network-calculator-iframe');
            if (iframe && e.data.height) {
                iframe.style.height = (e.data.height + 20) + 'px';
            }
        }
    });
})();
</script>
```

## Step 3: Security Note (Optional but Recommended)

For production, you can restrict which origins can send resize messages by replacing the wildcard `'*'` in the iframe's postMessage code. If you have access to modify the deployed calculator, update line 15 in `src/pages/index.js`:

Change:
```javascript
}, '*'); // Use specific origin in production if needed
```

To:
```javascript
}, 'https://your-wordpress-domain.com');
```

And in the WordPress listener script, add origin checking:

```javascript
window.addEventListener('message', function(e) {
    // Only accept messages from your calculator domain
    if (e.origin !== 'https://your-deployed-url.com') return;

    if (e.data && e.data.type === 'resize') {
        const iframe = document.querySelector('#network-calculator-iframe');
        if (iframe && e.data.height) {
            iframe.style.height = (e.data.height + 20) + 'px';
        }
    }
});
```

## How it Works

1. The calculator sends its height to the parent window whenever:
   - The page loads
   - The window is resized
   - The DOM changes (tabs switched, results displayed, etc.)
   - Every 500ms as a fallback

2. Your WordPress page listens for these messages and updates the iframe height accordingly

3. The iframe height adjusts automatically, eliminating scrollbars and providing a seamless embedded experience

## Testing

1. Deploy your calculator to a hosting service (Vercel, Netlify, etc.)
2. Add the iframe and script to a WordPress page
3. Test by:
   - Switching between calculator tabs
   - Calculating results to see content expand
   - Resizing the browser window
   - Testing on mobile devices

The iframe should resize smoothly without any scrollbars appearing!
