import DownloadsTrendChart from './components/DownloadsTrendChart.jsx';
import CompletionRateChart from './components/CompletionRateChart.jsx';
import ListenerMixChart from './components/ListenerMixChart.jsx';
import SubscriberGrowthChart from './components/SubscriberGrowthChart.jsx';
import SharesSubscribersScatter from './components/SharesSubscribersScatter.jsx';
import DurationCompletionScatter from './components/DurationCompletionScatter.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { usePodcastData } from './hooks/usePodcastData.js';

const App = () => {
  const { episodes, summary, insights, loading, error } = usePodcastData();

  if (loading) {
    return (
      <div className="app">
        <p>Loading podcast metrics…</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="app">
        <p>We couldn’t load the dataset. Please double-check that <code>public/podcast-metrics.csv</code> is available.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <ThemeToggle />
        <h1>Podcast Growth Intelligence</h1>
        <div className="summary-strip" aria-label="Key podcast metrics">
          <div className="summary-item">
            <span className="summary-icon" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <path d="M3 10h18" />
              </svg>
            </span>
            <div className="summary-item-text">
              <strong>Total Episodes</strong>
              <span>{summary.totalEpisodes}</span>
            </div>
          </div>
          <div className="summary-item">
            <span className="summary-icon" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 17l5-5 4 4 7-7" />
                <path d="M14 6h7v7" />
              </svg>
            </span>
            <div className="summary-item-text">
              <strong>Avg Downloads</strong>
              <span>{Math.round(summary.averageDownloads).toLocaleString()}</span>
            </div>
          </div>
          <div className="summary-item">
            <span className="summary-icon" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="8" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <div className="summary-item-text">
              <strong>Avg Completion</strong>
              <span>{(summary.averageCompletionRate * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="summary-item">
            <span className="summary-icon" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="8" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <div className="summary-item-text">
              <strong>Avg Duration</strong>
              <span>{summary.averageDuration.toFixed(1)} min</span>
            </div>
          </div>
          <div className="summary-item">
            <span className="summary-icon" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <div className="summary-item-text">
              <strong>Total Subscribers</strong>
              <span>{summary.totalSubscribers.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="chart-grid">
        <DownloadsTrendChart data={episodes} insight={insights.downloads} />
        <CompletionRateChart
          data={episodes}
          averageCompletionRate={summary.averageCompletionRate}
          insight={insights.completion}
        />
        <ListenerMixChart data={episodes} insight={insights.listenerMix} />
        <SubscriberGrowthChart data={episodes} insight={insights.subscriberGrowth} />
        <SharesSubscribersScatter data={episodes} insight={insights.sharesToSubs} />
        <DurationCompletionScatter data={episodes} insight={insights.duration} />
      </section>
    </div>
  );
};

export default App;
