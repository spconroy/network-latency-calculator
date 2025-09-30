import { useEffect } from "react";
import { LatencyCalculator } from "../components/latency_calculator";

export default function Home() {
  useEffect(() => {
    let lastHeight = 0;
    let resizeTimeout = null;

    // Function to send height to parent window (for iframe embedding)
    function sendHeight() {
      const height = document.documentElement.scrollHeight;

      // Only send if height has changed (prevents infinite loops)
      if (height === lastHeight) {
        return;
      }

      lastHeight = height;

      // Send message to parent window if embedded in iframe
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'resize',
          height: height
        }, '*'); // Use specific origin in production if needed
      }
    }

    // Debounced version to prevent excessive calls
    function debouncedSendHeight() {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(sendHeight, 100);
    }

    // Send height on initial load
    sendHeight();

    // Send height when window resizes (debounced)
    window.addEventListener('resize', debouncedSendHeight);

    // Use MutationObserver to detect DOM changes and resize accordingly (debounced)
    const observer = new MutationObserver(debouncedSendHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Send height periodically to catch any dynamic changes (every 500ms)
    const interval = setInterval(sendHeight, 500);

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedSendHeight);
      observer.disconnect();
      clearInterval(interval);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-start items-center p-8 pb-20 sm:p-20 font-sans">
      <main className="flex flex-col gap-8 items-center sm:items-start mt-16">
        <LatencyCalculator />
      </main>
    </div>
  );
}
