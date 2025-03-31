import React from 'react';
import { AnalyticsData } from '../../../app/parent/dashboard';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

interface AnalyticsViewProps {
  analytics: AnalyticsData | null;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Hours
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {analytics.totalHours}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Average Score
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {analytics.averageScore}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Improvement Rate
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                    {analytics.improvementRate}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Subject Performance */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Subject Performance
          </h3>
          <div className="space-y-4">
            {Object.entries(analytics.subjects).map(([subject, data]: [string, { dates: string[], engagement: number[], understanding: number[] }], index: number) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {subject}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {data.understanding[data.understanding.length - 1]}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${data.understanding[data.understanding.length - 1]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Attendance Rate
          </h3>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900">
                  Progress
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-indigo-600 dark:text-indigo-400">
                  {analytics.attendanceRate}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100 dark:bg-indigo-900">
              <div
                style={{ width: `${analytics.attendanceRate}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h3>
        <div className="flow-root">
          <ul className="-mb-8">
            {analytics.recentActivity.map((activity: { date: string, description: string }, index: number) => (
              <li key={index}>
                <div className="relative pb-8">
                  {index !== analytics.recentActivity.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {activity.description.charAt(0)}
                        </span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {activity.date}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView; 