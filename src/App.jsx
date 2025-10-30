import DownloadsTrendChart from './components/DownloadsTrendChart.jsx';
import CompletionRateChart from './components/CompletionRateChart.jsx';
import ListenerMixChart from './components/ListenerMixChart.jsx';
import SubscriberGrowthChart from './components/SubscriberGrowthChart.jsx';
import SharesSubscribersScatter from './components/SharesSubscribersScatter.jsx';
import DurationCompletionScatter from './components/DurationCompletionScatter.jsx';
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
        <h1>Podcast Growth Intelligence</h1>
        <div className="summary-strip" aria-label="Key podcast metrics">
          <div className="summary-item">
            <strong>Total Episodes</strong>
            <span>{summary.totalEpisodes}</span>
          </div>
          <div className="summary-item">
            <strong>Avg Downloads</strong>
            <span>{Math.round(summary.averageDownloads).toLocaleString()}</span>
          </div>
          <div className="summary-item">
            <strong>Avg Completion</strong>
            <span>{(summary.averageCompletionRate * 100).toFixed(1)}%</span>
          </div>
          <div className="summary-item">
            <strong>Avg Duration</strong>
            <span>{summary.averageDuration.toFixed(1)} min</span>
          </div>
          <div className="summary-item">
            <strong>Total Subscribers</strong>
            <span>{summary.totalSubscribers.toLocaleString()}</span>
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
