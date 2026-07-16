import { useState, useEffect } from 'react';
import { IconCollection } from './models/icon.model';
import * as iconifyService from './services/iconifyService';
import IconBrowser from './components/IconBrowser/IconBrowser';
import './index.css';

/**
 * Root application component for the React implementation of Iconify Navigator.
 *
 * Responsibilities:
 *  1. On mount, calls iconifyService.initialize() to load the server URL and
 *     the list of available icon collections from the Iconify API.
 *  2. Passes the loaded collections down to IconBrowser for rendering.
 *  3. Shows a loading indicator during initialization and an error banner on
 *     failure, matching the Angular implementation's UX.
 */
function App() {
  /** True while initialize() is running; hides the browser and shows a spinner. */
  const [loading, setLoading] = useState(true);

  /** Populated if initialization fails; displayed as an error banner to the user. */
  const [error, setError] = useState<string | null>(null);

  /** Full list of available icon collections fetched from the Iconify server. */
  const [collections, setCollections] = useState<IconCollection[]>([]);

  useEffect(() => {
    /** Initialize the service once, then reveal the icon browser. */
    iconifyService
      .initialize()
      .then(() => {
        setCollections(iconifyService.getCollections());
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Initialization failed';
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []); // Empty dependency array — runs once on mount, never on update.

  return (
    <div className="container">
      <header>
        <h1>Iconify Navigator</h1>
        <p>Search Iconify icons by name, category and tags</p>
      </header>
      <main>
        {loading && <p>Initializing...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && <IconBrowser collections={collections} />}
      </main>
    </div>
  );
}

export default App;
