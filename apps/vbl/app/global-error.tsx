'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">500</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Something went wrong!
            </h2>
            <p className="text-gray-600 mb-8">
              We're sorry, but something unexpected happened.
            </p>
            <button
              onClick={() => reset()}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
