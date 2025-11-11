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
  const contestantScoresRaw = scoresIndex.get(contestant.id) || [];
  const allowedJudgeUnion = new Set();
  const encounteredJudgeIds = new Set();
  const perCategoryStats = [];

  let criteriaCount = 0;

  categories.forEach((category) => {
    const criteria = category.criteria || [];
    const allowedJudgeIds = category.allowedJudgeIds || [];
    const allowedJudgeSet = allowedJudgeIds.length
      ? new Set(allowedJudgeIds.map((id) => String(id)))
      : null;

    if (allowedJudgeSet) {
      allowedJudgeSet.forEach((id) => allowedJudgeUnion.add(id));
    }

    criteriaCount += criteria.length;

    let categoryTotal = 0;
    let categoryScoresReceived = 0;
    const criteriaDetails = [];

    criteria.forEach((criterion) => {
      const entries = contestantScoresRaw.filter((score) => {
        if (score.criterion_id !== criterion.id) return false;
        if (!allowedJudgeSet) return true;
        const judgeIdentifier = score.judge_id || score.judgeId;
        if (!judgeIdentifier) return false;
        return allowedJudgeSet.has(String(judgeIdentifier));
      });

      if (!entries.length) {
        criteriaDetails.push({
          id: criterion.id,
          name: criterion.name,
          average: 0,
          maxPoints: criterion.max_points,
          submissions: 0,
        });
        return;
      }

      entries.forEach((entry) => {
        const judgeIdentifier = entry.judge_id || entry.judgeId;
        if (judgeIdentifier) {
          encounteredJudgeIds.add(String(judgeIdentifier));
        }
      });

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
        submissions: entries.length,
      });

      categoryTotal += average;
      categoryScoresReceived += entries.length;
    });

    const categoryMax = criteria.reduce(
      (sum, criterion) => sum + (criterion.max_points || 0),
      0
    );

    perCategoryStats.push({
      category,
      criteriaDetails,
      categoryTotal,
      categoryScoresReceived,
      categoryMax,
      criteriaCount: criteria.length,
    });
  });

  const fallbackJudgeCount = allowedJudgeUnion.size || encounteredJudgeIds.size;

  const effectiveJudgeCount =
    Number.isFinite(judgeCount) && judgeCount > 0
      ? Math.round(judgeCount)
      : fallbackJudgeCount > 0
      ? fallbackJudgeCount
      : null;

  let totalWeightedScore = 0;
  let totalWeightedScoreRaw = 0;
  let totalScoresReceived = 0;
  const categoryBreakdown = [];

  perCategoryStats.forEach(
    ({
      category,
      criteriaDetails,
      categoryTotal,
      categoryScoresReceived,
      categoryMax,
      criteriaCount: criteriaLength,
    }) => {
      totalScoresReceived += categoryScoresReceived;

      const rawNormalized =
        categoryMax > 0 ? (categoryTotal / categoryMax) * 100 : 0;
      const rawWeighted = rawNormalized * ((category.percentage || 0) / 100);

      const expectedCategoryScores = effectiveJudgeCount
        ? effectiveJudgeCount * criteriaLength
        : categoryScoresReceived;

      const categoryCompletionRatio =
        expectedCategoryScores > 0
          ? Math.min(categoryScoresReceived / expectedCategoryScores, 1)
          : 0;

      const normalized = rawNormalized * categoryCompletionRatio;
      const weighted = rawWeighted * categoryCompletionRatio;

      totalWeightedScoreRaw += rawWeighted;
      totalWeightedScore += weighted;

      categoryBreakdown.push({
        id: category.id,
        name: category.name,
        normalized,
        rawNormalized,
        weighted,
        rawWeighted,
        completionRatio: categoryCompletionRatio,
        percentage: category.percentage,
        criteria: criteriaDetails,
        submissions: categoryScoresReceived,
        expectedSubmissions: expectedCategoryScores,
      });
    }
  );

  const expectedScores = effectiveJudgeCount
    ? effectiveJudgeCount * criteriaCount
    : totalScoresReceived;

  const completionRatio =
    expectedScores > 0 ? Math.min(totalScoresReceived / expectedScores, 1) : 0;

  const completionRate = Math.round(completionRatio * 100);

  return {
    totalWeightedScore,
    totalWeightedScoreRaw,
    totalScoresReceived,
    expectedScores,
    completionRate,
    completionRatio,
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
  roundJudgeTargets = {},
  roundJudgeAssignments = {},
}) => {
  const normalizedTargets = Object.entries(roundJudgeTargets || {}).reduce(
    (acc, [key, value]) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        acc[String(key)] = numeric;
      }
      return acc;
    },
    {}
  );

  const activeJudgeIds = new Set(
    (judges || [])
      .filter((judge) => judge == null || judge.active !== false)
      .map((judge) => String(judge.id))
  );

  const normalizedAssignments = Object.entries(
    roundJudgeAssignments || {}
  ).reduce((acc, [roundId, judgeIds]) => {
    const idsArray = Array.isArray(judgeIds)
      ? judgeIds.map((id) => String(id))
      : [];
    const active = idsArray.filter((id) => activeJudgeIds.has(id));
    acc[String(roundId)] = {
      all: idsArray,
      active,
    };
    return acc;
  }, {});

  const activeJudgeCount = activeJudgeIds.size || judges.length || 0;
  const maxAssignmentCount = Object.values(normalizedAssignments).reduce(
    (max, info) => (info.active.length > max ? info.active.length : max),
    0
  );
  const fallbackTargetCount = Object.values(normalizedTargets).reduce(
    (max, current) => (current > max ? current : max),
    0
  );
  const effectiveOverallJudgeCount =
    maxAssignmentCount || fallbackTargetCount || activeJudgeCount;
  const scoresIndex = buildScoresIndex(scores);
  const roundsSorted = [...rounds].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  const normalizedCategories = (categories || []).map((category) => {
    const roundId = category.round_id || category.round?.id || null;
    const roundKey = roundId ? String(roundId) : null;
    const assignmentInfo = roundKey ? normalizedAssignments[roundKey] : null;
    return {
      ...category,
      round_id: roundKey,
      allowedJudgeIds: assignmentInfo?.active || [],
    };
  });

  const categoriesByRound = new Map();
  normalizedCategories.forEach((category) => {
    if (!category.round_id) return;
    if (!categoriesByRound.has(category.round_id)) {
      categoriesByRound.set(category.round_id, []);
    }
    categoriesByRound.get(category.round_id).push(category);
  });

  const overallTotals = contestants
    .map((contestant) => {
      const totals = calculateContestantRoundScore({
        contestant,
        categories: normalizedCategories,
        scoresIndex,
        judgeCount: effectiveOverallJudgeCount,
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
    const roundKey = String(round.id);
    const assignmentInfo = normalizedAssignments[roundKey];
    let judgeCountForRound = effectiveOverallJudgeCount;

    if (assignmentInfo) {
      if (assignmentInfo.active.length > 0) {
        judgeCountForRound = assignmentInfo.active.length;
      } else if (assignmentInfo.all.length > 0) {
        judgeCountForRound = 0;
      }
    } else if (normalizedTargets[roundKey]) {
      judgeCountForRound = normalizedTargets[roundKey];
    }

    const categoriesForRound = categoriesByRound.get(String(round.id)) || [];
    const limits = buildGenderLimits(round);

    const { rankings, byGender } = computeRoundRankings({
      round,
      categories: categoriesForRound,
      contestants: currentContestants,
      scoresIndex,
      judgeCount: judgeCountForRound,
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
      judgeCount: judgeCountForRound,
      assignedJudgeIds: assignmentInfo?.active || [],
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
