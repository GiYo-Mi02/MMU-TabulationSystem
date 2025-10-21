// Utility functions for computing round-based competition standings
// The calculations normalize scores per category and apply weightings
// while tracking round progression with gender-based cutoffs.

const GENDERS = {
  male: ["m", "male", "men", "masculine"],
  female: ["f", "female", "women", "feminine"],
};

const normalizeGender = (value = "") => {
  const lower = value.trim().toLowerCase();
  if (!lower) return "other";
  if (GENDERS.male.some((token) => lower.startsWith(token))) return "male";
  if (GENDERS.female.some((token) => lower.startsWith(token))) return "female";
  return "other";
};

const buildScoresIndex = (scores = []) => {
  const index = new Map();
  scores.forEach((record) => {
    const contestantId = record.contestant_id || record.contestantId;
    if (!contestantId) return;
    if (!index.has(contestantId)) {
      index.set(contestantId, []);
    }
    index.get(contestantId).push(record);
  });
  return index;
};

const calculateContestantRoundScore = ({
  contestant,
  categories,
  scoresIndex,
  judgeCount,
}) => {
  const contestantScores = scoresIndex.get(contestant.id) || [];
  let totalWeightedScore = 0;
  let totalScoresReceived = 0;
  const categoryBreakdown = [];
  const criteriaCount = categories.reduce(
    (sum, category) => sum + (category.criteria?.length || 0),
    0
  );

  categories.forEach((category) => {
    const criteria = category.criteria || [];
    const criteriaDetails = [];
    let categoryTotal = 0;

    criteria.forEach((criterion) => {
      const entries = contestantScores.filter(
        (score) => score.criterion_id === criterion.id
      );

      if (!entries.length) {
        criteriaDetails.push({
          id: criterion.id,
          name: criterion.name,
          average: 0,
          maxPoints: criterion.max_points,
        });
        return;
      }

      const sum = entries.reduce(
        (acc, record) => acc + parseFloat(record.score || 0),
        0
      );
      const average = sum / entries.length;

      criteriaDetails.push({
        id: criterion.id,
        name: criterion.name,
        average,
        maxPoints: criterion.max_points,
      });

      categoryTotal += average;
      totalScoresReceived += entries.length;
    });

    const categoryMax = criteria.reduce(
      (sum, criterion) => sum + (criterion.max_points || 0),
      0
    );

    const normalized =
      categoryMax > 0 ? (categoryTotal / categoryMax) * 100 : 0;
    const weighted = normalized * ((category.percentage || 0) / 100);

    totalWeightedScore += weighted;

    categoryBreakdown.push({
      id: category.id,
      name: category.name,
      normalized,
      weighted,
      percentage: category.percentage,
      criteria: criteriaDetails,
    });
  });

  const expectedScores = judgeCount * criteriaCount;
  const completionRate = expectedScores
    ? Math.round((totalScoresReceived / expectedScores) * 100)
    : 0;

  return {
    totalWeightedScore,
    totalScoresReceived,
    expectedScores,
    completionRate,
    categoryBreakdown,
  };
};

const buildGenderLimits = (roundConfig = {}) => {
  const make = (value) => {
    if (!value && value !== 0) return null;
    if (typeof value === "object") return value;
    return { male: value, female: value };
  };

  return {
    participation: make(
      roundConfig.max_per_gender ?? roundConfig.participants_per_gender
    ),
    advancement: make(
      roundConfig.advance_per_gender ?? roundConfig.advance_participants
    ),
    highlight: make(
      roundConfig.highlight_per_gender ?? roundConfig.highlight_participants
    ),
  };
};

const annotateGenderRanks = (byGender, highlightLimits) => {
  const result = {};
  Object.entries(byGender).forEach(([gender, list]) => {
    result[gender] = list.map((entry, index) => ({
      ...entry,
      genderRank: index + 1,
      isHighlighted:
        !!highlightLimits &&
        !!highlightLimits[gender] &&
        index < highlightLimits[gender],
    }));
  });
  return result;
};

const computeRoundRankings = ({
  round,
  categories,
  contestants,
  scoresIndex,
  judgeCount,
}) => {
  if (!categories || categories.length === 0) {
    return {
      round,
      rankings: [],
      byGender: {
        male: [],
        female: [],
        other: [],
      },
    };
  }

  const results = contestants
    .map((contestant) => {
      const gender = normalizeGender(contestant.sex || contestant.gender);
      const totals = calculateContestantRoundScore({
        contestant,
        categories,
        scoresIndex,
        judgeCount,
      });

      return {
        ...totals,
        contestant,
        gender,
      };
    })
    .filter((entry) => entry.totalScoresReceived > 0);

  results.sort((a, b) => b.totalWeightedScore - a.totalWeightedScore);

  const rankings = results.map((entry, index) => ({
    ...entry,
    overallRank: index + 1,
  }));

  const byGender = {
    male: [],
    female: [],
    other: [],
  };

  rankings.forEach((entry) => {
    byGender[entry.gender] = byGender[entry.gender] || [];
    byGender[entry.gender].push(entry);
  });

  return {
    round,
    rankings,
    byGender,
  };
};

export const computeCompetitionStandings = ({
  contestants = [],
  categories = [],
  scores = [],
  rounds = [],
  judges = [],
}) => {
  const judgeCount = judges.length || 0;
  const scoresIndex = buildScoresIndex(scores);
  const roundsSorted = [...rounds].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  const categoriesByRound = new Map();
  categories.forEach((category) => {
    const roundId = category.round_id || category.round?.id || null;
    const roundKey = roundId ? String(roundId) : null;
    if (!roundKey) return;
    const normalizedCategory = {
      ...category,
      round_id: roundKey,
    };
    if (!categoriesByRound.has(roundKey)) {
      categoriesByRound.set(roundKey, []);
    }
    categoriesByRound.get(roundKey).push(normalizedCategory);
  });

  const overallTotals = contestants
    .map((contestant) => {
      const totals = calculateContestantRoundScore({
        contestant,
        categories,
        scoresIndex,
        judgeCount,
      });
      const gender = normalizeGender(contestant.sex || contestant.gender);
      return {
        ...totals,
        contestant,
        gender,
      };
    })
    .filter((entry) => entry.totalScoresReceived > 0);

  overallTotals.sort((a, b) => b.totalWeightedScore - a.totalWeightedScore);

  const overallRankings = overallTotals.map((entry, index) => ({
    ...entry,
    overallRank: index + 1,
  }));

  const overallByGender = {
    male: [],
    female: [],
    other: [],
  };

  overallRankings.forEach((entry) => {
    overallByGender[entry.gender] = overallByGender[entry.gender] || [];
    overallByGender[entry.gender].push(entry);
  });

  let currentContestants = contestants;
  const roundsData = [];

  roundsSorted.forEach((round) => {
    const categoriesForRound = categoriesByRound.get(String(round.id)) || [];
    const limits = buildGenderLimits(round);

    const { rankings, byGender } = computeRoundRankings({
      round,
      categories: categoriesForRound,
      contestants: currentContestants,
      scoresIndex,
      judgeCount,
    });

    const limitedByGender = {};
    Object.entries(byGender).forEach(([gender, list]) => {
      const limitConfig = limits.participation;
      if (limitConfig && limitConfig[gender]) {
        limitedByGender[gender] = list.slice(0, limitConfig[gender]);
      } else {
        limitedByGender[gender] = list;
      }
    });

    const annotatedByGender = annotateGenderRanks(
      limitedByGender,
      limits.highlight
    );

    roundsData.push({
      round,
      rankings,
      byGender: annotatedByGender,
      participants: limitedByGender,
    });

    const advanced = [];
    Object.values(limitedByGender).forEach((genderList) => {
      genderList.forEach((entry) => {
        advanced.push(entry.contestant);
      });
    });

    currentContestants = advanced.length ? advanced : currentContestants;
  });

  return {
    overall: {
      rankings: overallRankings,
      byGender: overallByGender,
    },
    rounds: roundsData,
  };
};

export const summarizeRoundProgression = (roundsData = []) => {
  return roundsData.map(({ round, byGender }) => ({
    round,
    maleCount: byGender.male?.length || 0,
    femaleCount: byGender.female?.length || 0,
  }));
};
