import React from 'react';
import { SessionNote } from '../../../app/parent/dashboard';
import { format } from 'date-fns';

interface SessionsListProps {
  sessions: SessionNote[];
}

const SessionsList: React.FC<SessionsListProps> = ({ sessions }) => {
  return (
    <div className="space-y-6">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Session Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {session.subject}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(session.date), 'MMMM d, yyyy')} • {session.duration} minutes
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  session.status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Session Content */}
          <div className="px-6 py-4">
            <div className="space-y-4">
              {/* Learning Objectives */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Learning Objectives
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  {session.objectives.map((objective: string, index: number) => (
                    <li key={index}>{objective}</li>
                  ))}
                </ul>
              </div>

              {/* Session Notes */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Session Notes
                </h4>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {session.notes}
                </div>
              </div>

              {/* Homework */}
              {session.homework && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Homework
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {session.homework}
                    </p>
                  </div>
                </div>
              )}

              {/* Next Session */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Next Session
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {session.nextSession ? format(new Date(session.nextSession), 'MMMM d, yyyy') : 'Not scheduled'}
                </p>
              </div>
            </div>
          </div>

          {/* Session Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                    <span className="text-indigo-600 dark:text-indigo-300 font-medium">
                      {session.tutor.name.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.tutor.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {session.tutor.subject}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View Details
                </button>
                <button
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Schedule Next
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SessionsList; 