'use client';

import { useEffect, useState } from 'react';
import {
  getAllAchievements,
  getEarnedAchievements,
  getInProgressAchievements,
} from '@/lib/achievements';
import {
  getCurrentProfileTitle,
  getProfileBadges,
  getNextMilestone,
} from '@/lib/gamification';

interface RawData {
  activeChallenges: any[];
  archivedChallenges: any[];
  publicCheckIns: any[];
  activeHabit: any | null;
  habitLogs: any[];
}

export default function AchievementsDebugPage() {
  const [rawData, setRawData] = useState<RawData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    try {
      const activeCh =
        JSON.parse(localStorage.getItem('activeChallenges') || '[]') || [];
      const archivedCh =
        JSON.parse(localStorage.getItem('archivedChallenges') || '[]') || [];
      const checkIns =
        JSON.parse(localStorage.getItem('publicCheckIns') || '[]') || [];
      const habit =
        JSON.parse(localStorage.getItem('activeHabit') || 'null') || null;
      const logs = JSON.parse(localStorage.getItem('habitLogs') || '[]') || [];

      setRawData({
        activeChallenges: activeCh,
        archivedChallenges: archivedCh,
        publicCheckIns: checkIns,
        activeHabit: habit,
        habitLogs: logs,
      });
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  const resetAll = () => {
    localStorage.clear();
    setRawData({
      activeChallenges: [],
      archivedChallenges: [],
      publicCheckIns: [],
      activeHabit: null,
      habitLogs: [],
    });
  };

  const seed7DayStreak = () => {
    const today = new Date();
    const logs = [];

    for (let i = 6; i >= 0; i--) {
      logs.push({
        id: `log-${i}`,
        habitId: 'dev-habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done',
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'dev-habit-1' }));
    loadData();
  };

  const seed3DayStreak = () => {
    const today = new Date();
    const logs = [];

    for (let i = 2; i >= 0; i--) {
      logs.push({
        id: `log-${i}`,
        habitId: 'dev-habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done',
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'dev-habit-1' }));
    loadData();
  };

  const seed5Of7Days = () => {
    const today = new Date();
    const logs = [];
    const statuses = ['done', 'done', 'missed', 'done', 'done', 'missed', 'done'];

    for (let i = 6; i >= 0; i--) {
      logs.push({
        id: `log-${i}`,
        habitId: 'dev-habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: statuses[6 - i],
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'dev-habit-1' }));
    loadData();
  };

  const seed1ActiveChallenge = () => {
    const challenges = [
      {
        challengeId: 'dev-ch-1',
        projectId: 'dev-proj-1',
        plan: { title: 'Test Challenge' },
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem('activeChallenges', JSON.stringify(challenges));
    loadData();
  };

  const seed1ArchivedChallenge = () => {
    const challenges = [
      {
        challengeId: 'dev-ch-archived-1',
        projectId: 'dev-proj-archived-1',
        plan: { title: 'Completed Challenge' },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    localStorage.setItem('archivedChallenges', JSON.stringify(challenges));
    loadData();
  };

  const seed1PublicCheckIn = () => {
    const checkIns = [
      {
        id: 'dev-checkin-1',
        challengeId: 'dev-ch-1',
        date: new Date().toISOString(),
        message: 'Just started this awesome project!',
        displayName: 'Dev User',
      },
    ];
    localStorage.setItem('publicCheckIns', JSON.stringify(checkIns));
    loadData();
  };

  const seed3PublicCheckIns = () => {
    const checkIns = [
      {
        id: 'dev-checkin-1',
        challengeId: 'dev-ch-1',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        message: 'Just started this awesome project!',
        displayName: 'Dev User',
      },
      {
        id: 'dev-checkin-2',
        challengeId: 'dev-ch-1',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        message: 'Day 2 progress! So fun.',
        displayName: 'Dev User',
      },
      {
        id: 'dev-checkin-3',
        challengeId: 'dev-ch-1',
        date: new Date().toISOString(),
        message: 'Almost done! Loving this community.',
        displayName: 'Dev User',
      },
    ];
    localStorage.setItem('publicCheckIns', JSON.stringify(checkIns));
    loadData();
  };

  const seedBothHabitAndChallenge = () => {
    const today = new Date();
    const logs = [];

    for (let i = 2; i >= 0; i--) {
      logs.push({
        id: `log-${i}`,
        habitId: 'dev-habit-1',
        date: new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'done',
      });
    }

    localStorage.setItem('habitLogs', JSON.stringify(logs));
    localStorage.setItem('activeHabit', JSON.stringify({ habitId: 'dev-habit-1' }));
    localStorage.setItem('activeChallenges', JSON.stringify([
      {
        challengeId: 'dev-ch-1',
        projectId: 'dev-proj-1',
        plan: { title: 'Test Challenge' },
        createdAt: new Date().toISOString(),
      },
    ]));
    loadData();
  };

  if (!mounted) return null;

  const earned = getEarnedAchievements();
  const inProgress = getInProgressAchievements();
  const currentTitle = getCurrentProfileTitle();
  const badges = getProfileBadges();
  const nextMilestone = getNextMilestone();

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎮 Achievements Debug
          </h1>
          <p className="text-slate-300">Developer verification page</p>
        </div>

        {/* Seed Buttons */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Seed Test Data</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={resetAll}
              className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded font-medium transition"
            >
              🗑️ Reset All
            </button>
            <button
              onClick={seed7DayStreak}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
            >
              7-Day Streak
            </button>
            <button
              onClick={seed3DayStreak}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
            >
              3-Day Streak
            </button>
            <button
              onClick={seed5Of7Days}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
            >
              5 of 7 Days
            </button>
            <button
              onClick={seed1ActiveChallenge}
              className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded font-medium transition"
            >
              1 Active CH
            </button>
            <button
              onClick={seed1ArchivedChallenge}
              className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded font-medium transition"
            >
              1 Archived CH
            </button>
            <button
              onClick={seed1PublicCheckIn}
              className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition"
            >
              1 Check-in
            </button>
            <button
              onClick={seed3PublicCheckIns}
              className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition"
            >
              3 Check-ins
            </button>
            <button
              onClick={seedBothHabitAndChallenge}
              className="px-3 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium transition"
            >
              Habit + CH
            </button>
          </div>
        </div>

        {/* Raw Data */}
        {rawData && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Raw Data</h2>
            <div className="grid gap-4 text-sm">
              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-slate-400 font-mono">
                  Active Habit: {rawData.activeHabit ? 'Yes' : 'No'}
                </p>
                {rawData.activeHabit && (
                  <p className="text-slate-300 font-mono text-xs mt-1">
                    {JSON.stringify(rawData.activeHabit)}
                  </p>
                )}
              </div>

              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-slate-400 font-mono">
                  Habit Logs: {rawData.habitLogs.length}
                </p>
                {rawData.habitLogs.length > 0 && (
                  <p className="text-slate-300 font-mono text-xs mt-1">
                    Last 3:
                    {rawData.habitLogs
                      .slice(-3)
                      .map((log, i) => (
                        <span key={i} className="block">
                          {log.date}: {log.status}
                        </span>
                      ))}
                  </p>
                )}
              </div>

              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-slate-400 font-mono">
                  Active Challenges: {rawData.activeChallenges.length}
                </p>
              </div>

              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-slate-400 font-mono">
                  Archived Challenges: {rawData.archivedChallenges.length}
                </p>
              </div>

              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-slate-400 font-mono">
                  Public Check-ins: {rawData.publicCheckIns.length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Achievements Summary */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Current Title */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">📌 Current Title</h2>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg p-4 text-center">
              <p className="text-5xl mb-2">🎨</p>
              <p className="text-xl font-bold text-white">{currentTitle}</p>
            </div>
          </div>

          {/* Next Milestone */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">🎯 Next Milestone</h2>
            {nextMilestone ? (
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg p-4">
                <p className="text-3xl mb-2">{nextMilestone.emoji}</p>
                <p className="font-bold text-white">{nextMilestone.title}</p>
                <p className="text-sm text-purple-100 mt-2">
                  {nextMilestone.description}
                </p>
                {nextMilestone.progress !== undefined &&
                  nextMilestone.target !== undefined && (
                    <div className="mt-3">
                      <p className="text-xs text-purple-100 mb-1">
                        {nextMilestone.progress} / {nextMilestone.target}
                      </p>
                      <div className="w-full bg-purple-900 rounded-full h-2">
                        <div
                          className="bg-purple-200 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min((nextMilestone.progress / nextMilestone.target) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-slate-400">All achievements unlocked! 🎊</p>
            )}
          </div>
        </div>

        {/* Earned Achievements */}
        {earned.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mt-8">
            <h2 className="text-xl font-bold text-white mb-4">
              ✅ Earned Achievements ({earned.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {earned.map((ach) => (
                <div
                  key={ach.id}
                  className="bg-slate-900 border border-teal-500 rounded p-4 text-center"
                >
                  <p className="text-3xl mb-2">{ach.emoji}</p>
                  <p className="font-bold text-white text-sm">{ach.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{ach.category}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured Badges */}
        {badges.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mt-8">
            <h2 className="text-xl font-bold text-white mb-4">
              ⭐ Featured Badges (Show Few - {badges.length}/{earned.length})
            </h2>
            <div className="grid grid-cols-3 gap-6">
              {badges.map((badge) => (
                <div key={badge.id} className="text-center">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-3">
                    <p className="text-5xl">{badge.emoji}</p>
                  </div>
                  <p className="font-bold text-white">{badge.title}</p>
                  <p className="text-xs text-slate-400 mt- 1">
                    {badge.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In Progress */}
        {inProgress.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mt-8">
            <h2 className="text-xl font-bold text-white mb-4">
              🔄 In Progress ({inProgress.length})
            </h2>
            <div className="grid gap-4">
              {inProgress.map((ach) => (
                <div key={ach.id} className="bg-slate-900 p-4 rounded border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-lg font-bold text-white">{ach.emoji}</p>
                      <p className="text-white font-semibold">{ach.title}</p>
                      <p className="text-xs text-slate-400">{ach.description}</p>
                    </div>
                    {ach.progress !== undefined && ach.target !== undefined && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-cyan-400">
                          {ach.progress}/{ach.target}
                        </p>
                      </div>
                    )}
                  </div>
                  {ach.progress !== undefined && ach.target !== undefined && (
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-cyan-400 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((ach.progress / ach.target) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>🔧 This page is for development only</p>
          <p className="mt-1">
            Check your console for detailed achievement data
          </p>
        </div>
      </div>
    </div>
  );
}
