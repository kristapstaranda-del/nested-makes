# Nested Makes Achievements Testing Guide

This guide covers how to test and verify the achievements system in Nested Makes.

## Quick Start

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch
```

### Access Debug Page
Navigate to: http://localhost:3000/dev/achievements

## Unit Tests (`__tests__/achievements.test.ts`)

The test suite verifies that all 8 achievements are computed correctly under various conditions.

### Test Coverage

#### Achievement Verification (8 core tests)
- **Streak Keeper** - 3-day habit streak
- **Knitting Ninja** - 7-day habit streak
- **Consistency Star** - 5 of 7 days completed
- **Challenge Starter** - 1+ active challenge
- **Challenge Finisher** - 1+ archived challenge
- **Momentum Maker** - active habit + active challenge
- **Community Spark** - 1+ public check-in
- **Chatty Crafter** - 3+ public check-ins

#### Edge Case Tests
- Empty localStorage handling
- Malformed JSON gracefully handled
- Streak breaking on missed days
- Multiple badges earned simultaneously

#### Gamification Layer Tests
- Title priority order (Knitting Ninja > Chatty Crafter > ... > Curious Crafter)
- Featured badges selection (max 3, prioritizes habit streaks)
- Default title for new users

## Developer Debug Page (`app/dev/achievements/page.tsx`)

A visual development tool to seed test data and verify achievement logic in real-time.

### Accessing the Debug Page

1. Start the development server: `npm run dev`
2. Navigate to: **http://localhost:3000/dev/achievements**

### Features

#### Seed Test Data Buttons
- **🗑️ Reset All** - Clear all localStorage data
- **7-Day Streak** - Seed a current 7-day habit streak
- **3-Day Streak** - Seed a current 3-day habit streak
- **5 of 7 Days** - Seed a pattern with 5 completions and 2 missed days
- **1 Active CH** - Seed 1 active challenge
- **1 Archived CH** - Seed 1 completed (archived) challenge
- **1 Check-in** - Seed 1 public check-in
- **3 Check-ins** - Seed 3 public check-ins
- **Habit + CH** - Seed both an active habit (3-day streak) and active challenge

#### Live Data Display
- Raw Data Section: Active Habit status, habit logs, challenge counts, check-in counts
- Current Title Card: Computed profile title with emoji
- Next Milestone Card: Next achievement with progress bar
- Earned Achievements: Grid of all earned badges
- Featured Badges: Max 3 earned achievements (prioritizes habit streaks)
- In Progress: Achievements not yet earned but with progress

## Architecture & Data Flow

### Achievement Computation
1. **Raw Data** → `lib/achievements.ts` - Safe localStorage reading, computes all achievements
2. **Display Logic** → `lib/gamification.ts` - Determines title, featured badges, next milestone
3. **UI Components** → `components/profile/*` - ProfileAchievements, ProfileTitleCard, BadgeDisplay, NextAchievementCard

### Safety Mechanisms
- Graceful degradation for empty/malformed localStorage
- No crashes on first visit (default "Curious Crafter" title)
- Type safety with validated localStorage reads
- Pure functions for testability

## Extending the System

### Adding a New Achievement
1. Edit `lib/achievements.ts` - Add to `defineAllAchievements()`
2. Add tests in `__tests__/achievements.test.ts`
3. Optional: Update title priority in `lib/gamification.ts`
4. Test with debug page

## Troubleshooting

### Tests Show "Cannot find name 'describe'"
This is an IDE warning before `npm install`. Run `npm install` then `npm test`.

### Debug Page Shows "Curious Crafter" but I Seeded Data
Page caches data on mount. After seeding, it should auto-update. If not, refresh (F5).

### Achievement Not Appearing After Seeding
- Check browser DevTools → Application → Local Storage for data
- Verify achievement conditions are met
- Review computation logic in `lib/achievements.ts`

### Need to Debug Computation
Add console.log to `lib/achievements.ts` and check browser console on debug page load.

## Files Overview

| File | Purpose |
|------|---------|
| `lib/achievements.ts` | Core achievement logic, safe localStorage reading |
| `lib/gamification.ts` | Display-layer functions (title, badges, next) |
| `components/profile/ProfileAchievements.tsx` | Main achievements container |
| `components/profile/ProfileTitleCard.tsx` | Current title display |
| `components/profile/BadgeDisplay.tsx` | Individual badge component |
| `components/profile/NextAchievementCard.tsx` | Next milestone card |
| `app/dev/achievements/page.tsx` | Developer debug page |
| `__tests__/achievements.test.ts` | Comprehensive test suite |
| `jest.config.ts` | Jest configuration |
| `jest.setup.ts` | Jest setup (localStorage mock) |

## Summary
- **Tests**: `npm test` or `npm run test:watch`
- **Debug Page**: `http://localhost:3000/dev/achievements`
- **Safety**: Handles missing/malformed data gracefully
- **Architecture**: Pure functions in lib, optional UI components</content>
<parameter name="filePath">c:\Users\Kristaps\Desktop\HobbyBuddy\hobbybuddy-app\docs\achievements-testing.md