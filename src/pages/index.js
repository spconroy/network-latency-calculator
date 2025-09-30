import { useEffect } from "react";
import { LatencyCalculator } from "../components/latency_calculator";

export default function Home() {
  useEffect(() => {
    // Function to send height to parent window (for iframe embedding)
    function sendHeight() {
      const height = document.documentElement.scrollHeight;

      // Send message to parent window if embedded in iframe
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'resize',
          height: height
        }, '*'); // Use specific origin in production if needed
      }
    }

    // Send height on initial load
    sendHeight();

    // Send height when window resizes
    window.addEventListener('resize', sendHeight);

    // Use MutationObserver to detect DOM changes and resize accordingly
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    // Send height periodically to catch any dynamic changes
    const interval = setInterval(sendHeight, 500);

    // Cleanup
    return () => {
      window.removeEventListener('resize', sendHeight);
      observer.disconnect();
      clearInterval(interval);
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
