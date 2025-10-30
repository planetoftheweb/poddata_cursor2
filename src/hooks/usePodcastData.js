import { useEffect, useMemo, useState } from 'react';
import { csv } from 'd3-fetch';

const DATA_URL = '/podcast-metrics.csv';

const parseRow = (row) => {
  const [hours, minutes, seconds] = row.duration.split(':').map(Number);
  const durationMinutes = hours * 60 + minutes + seconds / 60;
  const downloads = Number(row.downloads);
  const completionNumbers = Number(row.completion_numbers);
  const newListeners = Number(row.new_listeners);
  const returningListeners = Number(row.returning_listeners);
  const listenersTotal = newListeners + returningListeners;

  return {
    episode: Number(row.episode),
    title: row.title,
    description: row.description,
    guest: row.guest,
    durationMinutes,
    downloads,
    completionNumbers,
    completionRate: downloads === 0 ? 0 : completionNumbers / downloads,
    newListeners,
    returningListeners,
    listenersTotal,
    subscribersGained: Number(row.subscribers_gained),
    socialMediaShares: Number(row.social_media_shares),
  };
};

const averageInWindow = (series, index, accessor, window = 7) => {
  const start = Math.max(0, index - (window - 1));
  const slice = series.slice(start, index + 1);
  const total = slice.reduce((sum, item) => sum + accessor(item), 0);
  return total / slice.length;
};

const correlation = (series, xAccessor, yAccessor) => {
  const xs = series.map(xAccessor);
  const ys = series.map(yAccessor);
  const n = xs.length;
  if (!n) return 0;
  const meanX = xs.reduce((sum, v) => sum + v, 0) / n;
  const meanY = ys.reduce((sum, v) => sum + v, 0) / n;
  const numerator = xs.reduce((sum, x, idx) => sum + (x - meanX) * (ys[idx] - meanY), 0);
  const variance = (values, mean) => values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  const denominator = Math.sqrt(variance(xs, meanX) * variance(ys, meanY));
  return denominator === 0 ? 0 : numerator / denominator;
};

export const usePodcastData = () => {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    csv(DATA_URL, parseRow)
      .then((rows) => {
        const sorted = rows.sort((a, b) => a.episode - b.episode);
        setRaw(sorted);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  const memoized = useMemo(() => {
    if (!raw.length) {
      return {
        episodes: [],
        summary: null,
        insights: {},
      };
    }

    let cumulativeSubscribers = 0;
    let cumulativeDownloads = 0;
    const episodes = raw.map((item, idx) => {
      cumulativeSubscribers += item.subscribersGained;
      cumulativeDownloads += item.downloads;
      const downloadsRolling = averageInWindow(raw, idx, (d) => d.downloads, 7);
      const completionRolling = averageInWindow(raw, idx, (d) => d.completionRate, 7);
      const newListenerRatio = item.listenersTotal === 0 ? 0 : item.newListeners / item.listenersTotal;

      return {
        ...item,
        cumulativeSubscribers,
        cumulativeDownloads,
        downloadsRolling,
        completionRolling,
        newListenerRatio,
        subscribersPerThousandDownloads:
          item.downloads === 0 ? 0 : (item.subscribersGained / item.downloads) * 1000,
        sharesPerThousandDownloads:
          item.downloads === 0 ? 0 : (item.socialMediaShares / item.downloads) * 1000,
      };
    });

    const halfwayIndex = Math.floor(episodes.length / 2);
    const earlySlice = episodes.slice(0, halfwayIndex);
    const lateSlice = episodes.slice(halfwayIndex);
    const arrAverage = (arr, accessor) => arr.reduce((sum, item) => sum + accessor(item), 0) / arr.length;

    const averageDownloadsEarly = arrAverage(earlySlice, (d) => d.downloads);
    const averageDownloadsLate = arrAverage(lateSlice, (d) => d.downloads);
    const avgCompletionEarly = arrAverage(earlySlice, (d) => d.completionRate);
    const avgCompletionLate = arrAverage(lateSlice, (d) => d.completionRate);
    const avgNewListenerRatioEarly = arrAverage(earlySlice, (d) => d.newListenerRatio);
    const avgNewListenerRatioLate = arrAverage(lateSlice, (d) => d.newListenerRatio);

    const sharesSubscribersCorrelation = correlation(
      episodes,
      (d) => d.socialMediaShares,
      (d) => d.subscribersGained
    );

    const durationCompletionCorrelation = correlation(
      episodes,
      (d) => d.durationMinutes,
      (d) => d.completionRate
    );

    const summary = {
      totalEpisodes: episodes.length,
      averageDownloads: arrAverage(episodes, (d) => d.downloads),
      averageCompletionRate: arrAverage(episodes, (d) => d.completionRate),
      averageDuration: arrAverage(episodes, (d) => d.durationMinutes),
      totalSubscribers: cumulativeSubscribers,
      downloadsGrowthPercent:
        averageDownloadsEarly === 0
          ? 0
          : ((averageDownloadsLate - averageDownloadsEarly) / averageDownloadsEarly) * 100,
      completionRateChange:
        (avgCompletionLate - avgCompletionEarly) * 100, // percentage points
      newListenerShareChange:
        (avgNewListenerRatioLate - avgNewListenerRatioEarly) * 100,
      sharesSubscribersCorrelation,
      durationCompletionCorrelation,
      latestEpisode: episodes[episodes.length - 1],
    };

    const formatPercent = (value, digits = 1) => `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;

    const insights = {
      downloads: `Recent episodes are averaging ${formatPercent(
        summary.downloadsGrowthPercent,
        1
      )} downloads versus the earliest half of the catalog.`,
      completion: `Completion rate moved ${formatPercent(summary.completionRateChange, 1)} from early episodes to the latest half.`,
      listenerMix: `New listeners make up ${formatPercent(summary.newListenerShareChange, 1)} more of the audience in newer episodes.`,
      subscriberGrowth: `Total subscribers climbed to ${summary.totalSubscribers.toLocaleString()} with the latest release.`,
      sharesToSubs:
        sharesSubscribersCorrelation >= 0
          ? `Social sharing strongly correlates with subscriber gains (r = ${sharesSubscribersCorrelation.toFixed(2)}).`
          : `Higher social sharing currently coincides with fewer subscribers (r = ${sharesSubscribersCorrelation.toFixed(2)}).`,
      duration:
        durationCompletionCorrelation >= 0
          ? `Longer episodes trend toward stronger completion rates (r = ${durationCompletionCorrelation.toFixed(2)}).`
          : `Longer episodes trend toward lower completion (r = ${durationCompletionCorrelation.toFixed(2)}); consider testing shorter cuts.`,
    };

    return { episodes, summary, insights };
  }, [raw]);

  return {
    episodes: memoized.episodes,
    summary: memoized.summary,
    insights: memoized.insights,
    loading,
    error,
  };
};
