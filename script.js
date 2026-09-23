// ======================================================
// PROJECT CONFIGURATION
// ======================================================

const TOP_K = 5;
const HEAD_SHARE = 0.20;
const BENCHMARK_BATCH_SIZE = 25;


// ======================================================
// DERIVED DATA
// ======================================================

let popularityByMovieId = new Map();

let headMovieIds = new Set();

let tailMovieIds = new Set();

let movieById = new Map();

let movieNormById = new Map();


// ======================================================
// APPLICATION INITIALIZATION
// ======================================================

window.addEventListener(
    "load",

    async () => {

        const status =
            document.getElementById(
                "app-status"
            );

        try {

            setStatus(
                status,
                "Loading MovieLens 100K data...",
                "loading"
            );

            await loadData();

            buildMovieIndexes();

            buildPopularityIndex();

            populateMovieDropdowns();

            bindEvents();

            updateDatasetSummary();

            runSanityChecks();

            setStatus(
                status,
                "Ready. Choose movies and run an experiment.",
                "success"
            );

        } catch (error) {

            console.error(
                "Initialization error:",
                error
            );

            setStatus(
                status,
                `Initialization failed: ${error.message}`,
                "error"
            );
        }
    }
);


// ======================================================
// EVENT HANDLERS
// ======================================================

function bindEvents() {

    document
        .getElementById(
            "item-btn"
        )
        .addEventListener(
            "click",
            handleItemToItem
        );

    document
        .getElementById(
            "profile-btn"
        )
        .addEventListener(
            "click",
            handleProfileBased
        );

    document
        .getElementById(
            "compare-btn"
        )
        .addEventListener(
            "click",
            handleComparison
        );

    document
        .getElementById(
            "bias-btn"
        )
        .addEventListener(
            "click",
            handleBiasDiagnostic
        );

    document
        .getElementById(
            "benchmark-btn"
        )
        .addEventListener(
            "click",
            handleCatalogBenchmark
        );
}


// ======================================================
// DATASET / VECTOR INDEXES
// ======================================================

function buildMovieIndexes() {

    movieById =
        new Map(
            movies.map(
                movie => [
                    movie.id,
                    movie
                ]
            )
        );


    movieNormById =
        new Map(
            movies.map(
                movie => [

                    movie.id,

                    vectorNorm(
                        movie.genreVector
                    )
                ]
            )
        );
}


function vectorNorm(
    vector
) {

    let sumSquares = 0;


    for (
        let i = 0;
        i < vector.length;
        i++
    ) {

        sumSquares +=
            vector[i] *
            vector[i];
    }


    return Math.sqrt(
        sumSquares
    );
}


// ======================================================
// DATASET SUMMARY
// ======================================================

function updateDatasetSummary() {

    document
        .getElementById(
            "dataset-summary"
        )
        .textContent =

        `${movies.length} movies · ` +
        `${ratings.length} ratings · ` +
        `18 genre features · ` +
        `Top-${TOP_K}`;


    document
        .getElementById(
            "tail-definition"
        )
        .textContent =

        "Long-tail definition for this project: " +
        `the top 20% most-rated movies are Head / popular (${headMovieIds.size}); ` +
        `the remaining 80% are Tail / long-tail (${tailMovieIds.size}).`;
}


// ======================================================
// POPULATE MOVIE DROPDOWNS
// ======================================================

function populateMovieDropdowns() {

    const ids = [

        "active-movie",

        "profile-movie-1",

        "profile-movie-2",

        "profile-movie-3"
    ];


    const sortedMovies =
        [...movies].sort(
            (a, b) =>
                a.title.localeCompare(
                    b.title
                )
        );


    ids.forEach(
        id => {

            const select =
                document.getElementById(
                    id
                );


            while (
                select.options.length > 1
            ) {

                select.remove(1);
            }


            sortedMovies.forEach(
                movie => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        movie.id;


                    option.textContent =
                        movie.title;


                    select.appendChild(
                        option
                    );
                }
            );
        }
    );
}


// ======================================================
// COSINE SIMILARITY / DOT PRODUCT
// ======================================================

function cosineSimilarity(
    vectorA,
    vectorB
) {

    if (
        !Array.isArray(vectorA) ||
        !Array.isArray(vectorB) ||
        vectorA.length !== vectorB.length
    ) {

        return 0;
    }


    const normA =
        vectorNorm(
            vectorA
        );


    const normB =
        vectorNorm(
            vectorB
        );


    return cosineSimilarityWithNorms(

        vectorA,

        vectorB,

        normA,

        normB
    );
}


function cosineSimilarityWithNorms(
    vectorA,
    vectorB,
    normA,
    normB
) {

    if (
        normA === 0 ||
        normB === 0
    ) {

        return 0;
    }


    let dot = 0;


    for (
        let i = 0;
        i < vectorA.length;
        i++
    ) {

        dot +=
            vectorA[i] *
            vectorB[i];
    }


    return (
        dot /
        (
            normA *
            normB
        )
    );
}


function dotProduct(
    vectorA,
    vectorB
) {

    if (
        !Array.isArray(vectorA) ||
        !Array.isArray(vectorB) ||
        vectorA.length !== vectorB.length
    ) {

        return 0;
    }


    let dot = 0;


    for (
        let i = 0;
        i < vectorA.length;
        i++
    ) {

        dot +=
            vectorA[i] *
            vectorB[i];
    }


    return dot;
}


// ======================================================
// BUILD USER PROFILE
// ======================================================

function buildUserProfile(
    selectedMovies
) {

    const profile =
        new Array(
            genreNames.length
        ).fill(0);


    if (
        !selectedMovies.length
    ) {

        return profile;
    }


    selectedMovies.forEach(
        movie => {

            movie
                .genreVector
                .forEach(
                    (
                        value,
                        index
                    ) => {

                        profile[index] +=
                            value;
                    }
                );
        }
    );


    return profile.map(
        value =>
            value /
            selectedMovies.length
    );
}


// ======================================================
// ITEM-TO-ITEM ENGINE
// ======================================================

function getItemRecommendations(
    movieId,
    k = TOP_K,
    metric = "cosine",
    excludedIds = []
) {

    const activeMovie =
        movieById.get(
            movieId
        );


    if (!activeMovie) {

        return {

            activeMovie:
                null,

            recommendations:
                []
        };
    }


    const excluded =
        new Set(
            excludedIds
        );


    excluded.add(
        activeMovie.id
    );


    const activeNorm =
        movieNormById.get(
            activeMovie.id
        ) || 0;


    const recommendations =
        movies

            .filter(
                movie =>
                    !excluded.has(
                        movie.id
                    )
            )

            .map(
                movie => ({

                    ...movie,

                    score:

                        metric === "dot"

                            ? dotProduct(
                                activeMovie.genreVector,
                                movie.genreVector
                            )

                            : cosineSimilarityWithNorms(

                                activeMovie.genreVector,

                                movie.genreVector,

                                activeNorm,

                                movieNormById.get(
                                    movie.id
                                ) || 0
                            )
                })
            );


    sortScoredMovies(
        recommendations
    );


    return {

        activeMovie,

        recommendations:
            recommendations.slice(
                0,
                k
            )
    };
}


// ======================================================
// PROFILE-BASED ENGINE
// ======================================================

function getProfileRecommendations(
    movieIds,
    k = TOP_K
) {

    const watchedMovies =
        movieIds

            .map(
                id =>
                    movieById.get(
                        id
                    )
            )

            .filter(
                Boolean
            );


    if (
        !watchedMovies.length
    ) {

        return {

            watchedMovies:
                [],

            profileVector:
                [],

            recommendations:
                []
        };
    }


    const profileVector =
        buildUserProfile(
            watchedMovies
        );


    const profileNorm =
        vectorNorm(
            profileVector
        );


    const watchedIds =
        new Set(
            watchedMovies.map(
                movie =>
                    movie.id
            )
        );


    const recommendations =
        movies

            .filter(
                movie =>
                    !watchedIds.has(
                        movie.id
                    )
            )

            .map(
                movie => ({

                    ...movie,

                    score:
                        cosineSimilarityWithNorms(

                            profileVector,

                            movie.genreVector,

                            profileNorm,

                            movieNormById.get(
                                movie.id
                            ) || 0
                        )
                })
            );


    sortScoredMovies(
        recommendations
    );


    return {

        watchedMovies,

        profileVector,

        recommendations:
            recommendations.slice(
                0,
                k
            )
    };
}


// ======================================================
// DETERMINISTIC SORTING
// ======================================================

function sortScoredMovies(
    items
) {

    items.sort(
        (a, b) => {

            if (
                b.score !== a.score
            ) {

                return (
                    b.score -
                    a.score
                );
            }


            return (
                a.title.localeCompare(
                    b.title
                )
            );
        }
    );
}


// ======================================================
// BUTTON: ITEM-TO-ITEM
// ======================================================

function handleItemToItem() {

    const container =
        document.getElementById(
            "item-result"
        );


    const movieId =
        readSelectedMovieId(
            "active-movie"
        );


    if (
        movieId === null
    ) {

        renderMessage(

            container,

            "Select an active movie first.",

            "error"
        );

        return;
    }


    const result =
        getItemRecommendations(
            movieId
        );


    renderItemResults(

        container,

        result.activeMovie,

        result.recommendations
    );
}


// ======================================================
// BUTTON: PROFILE-BASED
// ======================================================

function handleProfileBased() {

    const container =
        document.getElementById(
            "profile-result"
        );


    const ids =
        readProfileIds();


    if (!ids) {

        renderMessage(

            container,

            "Select three different watched movies.",

            "error"
        );

        return;
    }


    renderProfileResults(

        container,

        getProfileRecommendations(
            ids
        )
    );
}


// ======================================================
// BUTTON: MODEL COMPARISON
// ======================================================

function handleComparison() {

    const container =
        document.getElementById(
            "compare-result"
        );


    const activeMovieId =
        readSelectedMovieId(
            "active-movie"
        );


    const profileIds =
        readProfileIds();


    if (
        activeMovieId === null ||
        !profileIds
    ) {

        renderMessage(

            container,

            "Choose one active movie and three different " +
            "watched movies in Sections 01 and 02 first.",

            "error"
        );

        return;
    }


    const itemResult =
        getItemRecommendations(

            activeMovieId,

            TOP_K,

            "cosine",

            profileIds
        );


    const profileResult =
        getProfileRecommendations(
            profileIds
        );


    renderComparison(

        container,

        itemResult,

        profileResult
    );
}


// ======================================================
// BUTTON: COSINE NORMALIZATION
// ======================================================

function handleBiasDiagnostic() {

    const container =
        document.getElementById(
            "bias-result"
        );


    const activeMovieId =
        readSelectedMovieId(
            "active-movie"
        );


    if (
        activeMovieId === null
    ) {

        renderMessage(

            container,

            "Select an active movie in Section 01 first.",

            "error"
        );

        return;
    }


    const cosineResult =
        getItemRecommendations(

            activeMovieId,

            TOP_K,

            "cosine"
        );


    const dotResult =
        getItemRecommendations(

            activeMovieId,

            TOP_K,

            "dot"
        );


    renderBiasDiagnostic(

        container,

        cosineResult.activeMovie,

        dotResult.recommendations,

        cosineResult.recommendations
    );
}


// ======================================================
// BUTTON: FAST FULL CATALOG BENCHMARK
// ======================================================

async function handleCatalogBenchmark() {

    const container =
        document.getElementById(
            "benchmark-result"
        );


    const button =
        document.getElementById(
            "benchmark-btn"
        );


    const originalText =
        button.textContent;


    button.disabled =
        true;


    button.textContent =
        "Preparing benchmark...";


    container.innerHTML = `

        <div class="inline-message">

            Preparing all eligible MovieLens histories...

        </div>
    `;


    await yieldToBrowser();


    try {

        const benchmark =
            await runCatalogBenchmarkFast(

                (
                    completed,
                    total
                ) => {

                    const percent =
                        Math.round(

                            (
                                completed /
                                total
                            ) * 100
                        );


                    button.textContent =
                        `Running benchmark... ${percent}%`;


                    container.innerHTML = `

                        <div class="inline-message">

                            Processing users:
                            ${completed} / ${total}
                            (${percent}%)

                        </div>
                    `;
                }
            );


        if (
            !benchmark ||
            benchmark.usersEvaluated === 0
        ) {

            renderMessage(

                container,

                "Not enough eligible user histories " +
                "were found for the benchmark.",

                "error"
            );

            return;
        }


        renderCatalogBenchmark(

            container,

            benchmark
        );


    } catch (error) {

        console.error(
            "Catalog benchmark error:",
            error
        );


        renderMessage(

            container,

            `Benchmark failed: ${error.message}`,

            "error"
        );


    } finally {

        button.disabled =
            false;


        button.textContent =
            originalText;
    }
}


function yieldToBrowser() {

    return new Promise(

        resolve =>
            setTimeout(
                resolve,
                0
            )
    );
}


// ======================================================
// READ INPUT
// ======================================================

function readSelectedMovieId(
    selectId
) {

    const id =
        parseInt(

            document
                .getElementById(
                    selectId
                )
                .value,

            10
        );


    return (
        Number.isNaN(id)

            ? null

            : id
    );
}


function readProfileIds() {

    const ids = [

        "profile-movie-1",

        "profile-movie-2",

        "profile-movie-3"

    ].map(
        readSelectedMovieId
    );


    if (
        ids.some(
            id =>
                id === null
        )
    ) {

        return null;
    }


    if (
        new Set(ids).size !==
        ids.length
    ) {

        return null;
    }


    return ids;
}


// ======================================================
// POPULARITY AND LONG-TAIL INDEX
// ======================================================

function buildPopularityIndex() {

    popularityByMovieId =
        new Map(
            movies.map(
                movie => [
                    movie.id,
                    0
                ]
            )
        );


    ratings.forEach(
        rating => {

            popularityByMovieId.set(

                rating.itemId,

                (
                    popularityByMovieId.get(
                        rating.itemId
                    ) || 0
                ) + 1
            );
        }
    );


    const ranked =
        [...movies].sort(
            (a, b) => {

                const diff =

                    getPopularity(
                        b.id
                    )

                    -

                    getPopularity(
                        a.id
                    );


                return (

                    diff !== 0

                        ? diff

                        : a.title.localeCompare(
                            b.title
                        )
                );
            }
        );


    const headSize =
        Math.max(

            1,

            Math.ceil(
                ranked.length *
                HEAD_SHARE
            )
        );


    headMovieIds =
        new Set(

            ranked

                .slice(
                    0,
                    headSize
                )

                .map(
                    movie =>
                        movie.id
                )
        );


    tailMovieIds =
        new Set(

            ranked

                .slice(
                    headSize
                )

                .map(
                    movie =>
                        movie.id
                )
        );
}


function getPopularity(
    movieId
) {

    return (
        popularityByMovieId.get(
            movieId
        ) || 0
    );
}


function getCatalogSegment(
    movieId
) {

    return (

        headMovieIds.has(
            movieId
        )

            ? "Head"

            : "Tail"
    );
}


function getCatalogSegmentLabel(
    movieId
) {

    return (

        headMovieIds.has(
            movieId
        )

            ? "Head · popular"

            : "Tail · long-tail"
    );
}


// ======================================================
// RECOMMENDATION METRICS
// ======================================================

function recommendationMetrics(
    recommendations
) {

    if (
        !recommendations.length
    ) {

        return {

            meanSimilarity:
                0,

            meanPopularity:
                0,

            tailShare:
                0,

            genreCoverage:
                0
        };
    }


    const uniqueGenres =
        new Set(

            recommendations.flatMap(
                movie =>
                    movie.genres
            )
        );


    return {

        meanSimilarity:
            average(

                recommendations.map(
                    movie =>
                        movie.score
                )
            ),


        meanPopularity:
            average(

                recommendations.map(
                    movie =>
                        getPopularity(
                            movie.id
                        )
                )
            ),


        tailShare:

            recommendations.filter(
                movie =>
                    tailMovieIds.has(
                        movie.id
                    )
            ).length

            /

            recommendations.length,


        genreCoverage:
            uniqueGenres.size
    };
}


function average(
    values
) {

    return (

        values.length

            ? values.reduce(

                (
                    sum,
                    value
                ) =>
                    sum + value,

                0
            )

            /

            values.length

            : 0
    );
}


// ======================================================
// BUILD ALL ELIGIBLE USER HISTORIES
// ======================================================

function buildPositiveHistories() {

    const byUser =
        new Map();


    ratings.forEach(
        rating => {

            const movie =
                movieById.get(
                    rating.itemId
                );


            const hasKnownGenre =

                movie

                &&

                movie.genreVector.some(
                    value =>
                        value === 1
                );


            if (
                rating.rating >= 4 &&
                hasKnownGenre
            ) {

                if (
                    !byUser.has(
                        rating.userId
                    )
                ) {

                    byUser.set(
                        rating.userId,
                        []
                    );
                }


                byUser
                    .get(
                        rating.userId
                    )
                    .push(
                        rating
                    );
            }
        }
    );


    const histories =
        [];


    const userIds =
        [...byUser.keys()]
            .sort(
                (a, b) =>
                    a - b
            );


    for (
        const userId
        of userIds
    ) {

        const positiveRatings =
            byUser
                .get(
                    userId
                )
                .sort(
                    (
                        a,
                        b
                    ) =>

                        b.timestamp -
                        a.timestamp

                        ||

                        b.rating -
                        a.rating
                );


        const unique =
            [];


        const seen =
            new Set();


        for (
            const rating
            of positiveRatings
        ) {

            if (
                !seen.has(
                    rating.itemId
                )
            ) {

                seen.add(
                    rating.itemId
                );


                unique.push(
                    rating
                );
            }


            if (
                unique.length === 3
            ) {

                break;
            }
        }


        if (
            unique.length === 3
        ) {

            histories.push({

                userId,

                movieIds:
                    unique.map(
                        rating =>
                            rating.itemId
                    ),

                activeMovieId:
                    unique[0].itemId
            });
        }
    }


    return histories;
}


// ======================================================
// FAST TOP-K HELPERS FOR FULL BENCHMARK
// ======================================================

function candidateComesBefore(
    a,
    b
) {

    if (
        a.score !== b.score
    ) {

        return (
            a.score >
            b.score
        );
    }


    return (

        a.movie.title.localeCompare(
            b.movie.title
        ) < 0
    );
}


function insertIntoTopK(
    topK,
    candidate,
    k = TOP_K
) {

    let insertAt =
        topK.length;


    for (
        let i = 0;
        i < topK.length;
        i++
    ) {

        if (
            candidateComesBefore(
                candidate,
                topK[i]
            )
        ) {

            insertAt =
                i;

            break;
        }
    }


    if (
        insertAt < k
    ) {

        topK.splice(
            insertAt,
            0,
            candidate
        );


        if (
            topK.length > k
        ) {

            topK.pop();
        }


    } else if (
        topK.length < k
    ) {

        topK.push(
            candidate
        );
    }
}


// ======================================================
// FAST ITEM BENCHMARK RECOMMENDER
// ======================================================

function fastItemRecommendationsForBenchmark(
    activeMovieId,
    excludedIds,
    k = TOP_K
) {

    const activeMovie =
        movieById.get(
            activeMovieId
        );


    if (!activeMovie) {

        return [];
    }


    const excluded =
        new Set(
            excludedIds
        );


    excluded.add(
        activeMovieId
    );


    const activeNorm =
        movieNormById.get(
            activeMovieId
        ) || 0;


    const topK =
        [];


    for (
        const movie
        of movies
    ) {

        if (
            excluded.has(
                movie.id
            )
        ) {

            continue;
        }


        const score =
            cosineSimilarityWithNorms(

                activeMovie.genreVector,

                movie.genreVector,

                activeNorm,

                movieNormById.get(
                    movie.id
                ) || 0
            );


        insertIntoTopK(

            topK,

            {
                movie,
                score
            },

            k
        );
    }


    return topK.map(
        item => ({

            ...item.movie,

            score:
                item.score
        })
    );
}


// ======================================================
// FAST PROFILE BENCHMARK RECOMMENDER
// ======================================================

function fastProfileRecommendationsForBenchmark(
    movieIds,
    k = TOP_K
) {

    const watchedMovies =
        movieIds

            .map(
                id =>
                    movieById.get(
                        id
                    )
            )

            .filter(
                Boolean
            );


    if (
        !watchedMovies.length
    ) {

        return [];
    }


    const profileVector =
        buildUserProfile(
            watchedMovies
        );


    const profileNorm =
        vectorNorm(
            profileVector
        );


    const watchedIds =
        new Set(
            movieIds
        );


    const topK =
        [];


    for (
        const movie
        of movies
    ) {

        if (
            watchedIds.has(
                movie.id
            )
        ) {

            continue;
        }


        const score =
            cosineSimilarityWithNorms(

                profileVector,

                movie.genreVector,

                profileNorm,

                movieNormById.get(
                    movie.id
                ) || 0
            );


        insertIntoTopK(

            topK,

            {
                movie,
                score
            },

            k
        );
    }


    return topK.map(
        item => ({

            ...item.movie,

            score:
                item.score
        })
    );
}


// ======================================================
// ONLINE BENCHMARK ACCUMULATOR
// ======================================================

function createExposureAccumulator() {

    return {

        count:
            0,

        tailCount:
            0,

        popularitySum:
            0,

        similaritySum:
            0,

        uniqueMovieIds:
            new Set()
    };
}


function addRecommendationsToAccumulator(
    accumulator,
    recommendations
) {

    for (
        const movie
        of recommendations
    ) {

        accumulator.count +=
            1;


        if (
            tailMovieIds.has(
                movie.id
            )
        ) {

            accumulator.tailCount +=
                1;
        }


        accumulator.popularitySum +=
            getPopularity(
                movie.id
            );


        accumulator.similaritySum +=
            movie.score;


        accumulator.uniqueMovieIds.add(
            movie.id
        );
    }
}


function finalizeExposureAccumulator(
    accumulator
) {

    const count =
        accumulator.count;


    const uniqueItems =
        accumulator
            .uniqueMovieIds
            .size;


    return {

        exposures:
            count,


        tailShare:

            count

                ? accumulator.tailCount /
                  count

                : 0,


        meanPopularity:

            count

                ? accumulator.popularitySum /
                  count

                : 0,


        meanSimilarity:

            count

                ? accumulator.similaritySum /
                  count

                : 0,


        uniqueItems,


        catalogCoverage:

            movies.length

                ? uniqueItems /
                  movies.length

                : 0
    };
}


// ======================================================
// FAST, CHUNKED FULL CATALOG BENCHMARK
// ======================================================

async function runCatalogBenchmarkFast(
    onProgress
) {

    const histories =
        buildPositiveHistories();


    const itemAccumulator =
        createExposureAccumulator();


    const profileAccumulator =
        createExposureAccumulator();


    for (
        let i = 0;
        i < histories.length;
        i++
    ) {

        const history =
            histories[i];


        const itemRecommendations =
            fastItemRecommendationsForBenchmark(

                history.activeMovieId,

                history.movieIds,

                TOP_K
            );


        const profileRecommendations =
            fastProfileRecommendationsForBenchmark(

                history.movieIds,

                TOP_K
            );


        addRecommendationsToAccumulator(

            itemAccumulator,

            itemRecommendations
        );


        addRecommendationsToAccumulator(

            profileAccumulator,

            profileRecommendations
        );


        const completed =
            i + 1;


        if (
            completed %
                BENCHMARK_BATCH_SIZE ===
                0

            ||

            completed ===
                histories.length
        ) {

            if (
                typeof onProgress ===
                "function"
            ) {

                onProgress(

                    completed,

                    histories.length
                );
            }


            await yieldToBrowser();
        }
    }


    return {

        usersEvaluated:
            histories.length,


        item:
            finalizeExposureAccumulator(
                itemAccumulator
            ),


        profile:
            finalizeExposureAccumulator(
                profileAccumulator
            )
    };
}


// ======================================================
// RENDER ITEM-TO-ITEM
// ======================================================

function renderItemResults(
    container,
    activeMovie,
    recommendations
) {

    const cards =
        recommendations

            .map(
                (
                    movie,
                    index
                ) => {

                    const shared =
                        activeMovie
                            .genres
                            .filter(
                                genre =>
                                    movie
                                        .genres
                                        .includes(
                                            genre
                                        )
                            );


                    const explanation =

                        shared.length

                            ? `Shared: ${shared.join(", ")}`

                            : "No shared named genre";


                    return movieCard(

                        movie,

                        index,

                        explanation
                    );
                }
            )

            .join("");


    container.innerHTML = `

        <div class="result-header">

            <div>

                <span class="eyebrow">
                    Active item
                </span>

                <h3>
                    ${escapeHtml(activeMovie.title)}
                </h3>

                <p>
                    ${formatGenres(activeMovie.genres)}
                </p>

            </div>


            <div class="formula-chip">

                score(i|t) =
                cos(x<sub>t</sub>, x<sub>i</sub>)

            </div>

        </div>


        <div class="movie-card-grid">

            ${cards}

        </div>


        <p class="method-note">

            The active movie is excluded.
            Equal scores are tie-broken alphabetically
            for reproducibility.

        </p>
    `;
}


// ======================================================
// RENDER PROFILE-BASED
// ======================================================

function renderProfileResults(
    container,
    result
) {

    const profileChips =
        genreNames

            .map(
                (
                    genre,
                    index
                ) => ({

                    genre,

                    weight:
                        result
                            .profileVector[
                                index
                            ]
                })
            )

            .filter(
                item =>
                    item.weight > 0
            )

            .sort(
                (
                    a,
                    b
                ) =>
                    b.weight -
                    a.weight
            )

            .map(
                item => `

                    <span class="profile-chip">

                        ${escapeHtml(item.genre)}

                        <strong>
                            ${item.weight.toFixed(2)}
                        </strong>

                    </span>
                `
            )

            .join("");


    const cards =
        result
            .recommendations

            .map(
                (
                    movie,
                    index
                ) => {

                    const matches =
                        genreNames

                            .map(
                                (
                                    genre,
                                    featureIndex
                                ) => ({

                                    genre,

                                    weight:
                                        result
                                            .profileVector[
                                                featureIndex
                                            ],

                                    hasGenre:
                                        movie
                                            .genreVector[
                                                featureIndex
                                            ] === 1
                                })
                            )

                            .filter(
                                item =>
                                    item.hasGenre &&
                                    item.weight > 0
                            )

                            .sort(
                                (
                                    a,
                                    b
                                ) =>
                                    b.weight -
                                    a.weight
                            )

                            .map(
                                item =>

                                    `${item.genre} ` +
                                    `${item.weight.toFixed(2)}`
                            );


                    const explanation =

                        matches.length

                            ? `Profile match: ${matches.join(" · ")}`

                            : "No positive profile match";


                    return movieCard(

                        movie,

                        index,

                        explanation
                    );
                }
            )

            .join("");


    container.innerHTML = `

        <div class="result-header">

            <div>

                <span class="eyebrow">
                    User history
                </span>

                <h3>

                    ${
                        result
                            .watchedMovies

                            .map(
                                movie =>
                                    escapeHtml(
                                        movie.title
                                    )
                            )

                            .join(" · ")
                    }

                </h3>

            </div>


            <div class="formula-chip">

                p<sub>u</sub> =
                average(
                    x<sub>1</sub>,
                    x<sub>2</sub>,
                    x<sub>3</sub>
                )

            </div>

        </div>


        <div class="profile-box">

            <strong>
                Learned taste profile
            </strong>


            <div class="profile-chips">

                ${
                    profileChips ||

                    `
                    <span class="muted">
                        No known genre features
                    </span>
                    `
                }

            </div>

        </div>


        <div class="movie-card-grid">

            ${cards}

        </div>


        <p class="method-note">

            All three watched movies
            are excluded before ranking.

        </p>
    `;
}


// ======================================================
// MOVIE CARD
// ======================================================

function movieCard(
    movie,
    index,
    explanation
) {

    const segmentClass =
        getCatalogSegment(
            movie.id
        ).toLowerCase();


    return `

        <article class="movie-card">

            <div class="movie-rank">

                #${index + 1}

            </div>


            <div class="movie-card-body">

                <h4>
                    ${escapeHtml(movie.title)}
                </h4>


                <div class="genre-line">

                    ${formatGenres(movie.genres)}

                </div>


                <div class="score-row">

                    <span>
                        Similarity score
                    </span>

                    <strong>
                        ${movie.score.toFixed(3)}
                    </strong>

                </div>


                <div class="explanation">

                    ${escapeHtml(explanation)}

                </div>


                <div class="movie-meta">

                    <span>

                        ${getPopularity(movie.id)}
                        ratings

                    </span>


                    <span
                        class="
                            segment-badge
                            ${segmentClass}
                        "
                    >

                        ${getCatalogSegmentLabel(movie.id)}

                    </span>

                </div>

            </div>

        </article>
    `;
}


// ======================================================
// MODEL COMPARISON
// ======================================================

function renderComparison(
    container,
    itemResult,
    profileResult
) {

    const itemMetrics =
        recommendationMetrics(
            itemResult.recommendations
        );


    const profileMetrics =
        recommendationMetrics(
            profileResult.recommendations
        );


    const itemIds =
        new Set(
            itemResult
                .recommendations

                .map(
                    movie =>
                        movie.id
                )
        );


    const overlap =
        profileResult
            .recommendations

            .filter(
                movie =>
                    itemIds.has(
                        movie.id
                    )
            )

            .length;


    const overlapRate =
        overlap /
        TOP_K;


    const observations =
        buildComparisonObservations(

            itemMetrics,

            profileMetrics,

            overlap,

            overlapRate
        );


    container.innerHTML = `

        <div class="metric-grid">

            ${metricCard(
                "Overlap@5",
                `${overlap}/${TOP_K}`,
                `${formatPercent(overlapRate)} shared`
            )}

            ${metricCard(
                "Item tail share",
                formatPercent(
                    itemMetrics.tailShare
                ),
                "Current active item"
            )}

            ${metricCard(
                "Profile tail share",
                formatPercent(
                    profileMetrics.tailShare
                ),
                "Aggregated taste"
            )}

            ${metricCard(
                "Popularity gap",
                Math
                    .abs(
                        itemMetrics.meanPopularity -
                        profileMetrics.meanPopularity
                    )
                    .toFixed(1),
                "Mean rating-count difference"
            )}

        </div>


        <div class="comparison-grid">

            ${miniRecommendationList(
                "Item-to-Item Top-5",
                itemResult.activeMovie.title,
                itemResult.recommendations
            )}

            ${miniRecommendationList(
                "Profile-Based Top-5",
                "Three-movie profile",
                profileResult.recommendations
            )}

        </div>


        <div class="table-wrap">

            <table class="analysis-table">

                <thead>

                    <tr>

                        <th>
                            Metric
                        </th>

                        <th>
                            Item-to-Item
                        </th>

                        <th>
                            Profile-Based
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${metricRow(
                        "Mean cosine similarity",
                        itemMetrics.meanSimilarity.toFixed(3),
                        profileMetrics.meanSimilarity.toFixed(3)
                    )}

                    ${metricRow(
                        "Mean popularity (# ratings)",
                        itemMetrics.meanPopularity.toFixed(1),
                        profileMetrics.meanPopularity.toFixed(1)
                    )}

                    ${metricRow(
                        "Long-tail share",
                        formatPercent(itemMetrics.tailShare),
                        formatPercent(profileMetrics.tailShare)
                    )}

                    ${metricRow(
                        "Genre coverage in Top-5",
                        itemMetrics.genreCoverage,
                        profileMetrics.genreCoverage
                    )}

                </tbody>

            </table>

        </div>


        <div class="analysis-box">

            <h3>
                Scenario interpretation
            </h3>

            <ul>

                ${
                    observations
                        .map(
                            text => `

                                <li>
                                    ${escapeHtml(text)}
                                </li>
                            `
                        )
                        .join("")
                }

            </ul>

        </div>
    `;
}


// ======================================================
// NORMALIZATION DIAGNOSTIC
// ======================================================

function renderBiasDiagnostic(
    container,
    activeMovie,
    dotRecommendations,
    cosineRecommendations
) {

    const controlled =
        buildControlledNormalizationExample(
            activeMovie
        );


    const dotIds =
        new Set(
            dotRecommendations.map(
                movie =>
                    movie.id
            )
        );


    const overlap =
        cosineRecommendations

            .filter(
                movie =>
                    dotIds.has(
                        movie.id
                    )
            )

            .length;


    container.innerHTML = `

        <div class="result-header">

            <div>

                <span class="eyebrow">
                    Normalization diagnostic
                </span>

                <h3>
                    ${escapeHtml(activeMovie.title)}
                </h3>

                <p>
                    ${formatGenres(activeMovie.genres)}
                </p>

            </div>


            <div class="formula-chip">

                cos(x,y) =
                (x·y) /
                (||x|| ||y||)

            </div>

        </div>


        <div class="controlled-example">

            <h3>
                Controlled example
            </h3>

            <p>

                We compare an exact content match
                with a synthetic multi-genre candidate
                that keeps every active genre
                but adds unmatched genres.

            </p>


            <div class="metric-grid">

                ${metricCard(
                    "Exact match · dot",
                    controlled.exactDot.toFixed(0),
                    "Same active genres"
                )}

                ${metricCard(
                    "Extra-genre · dot",
                    controlled.extraDot.toFixed(0),
                    "Extras are not penalized"
                )}

                ${metricCard(
                    "Exact match · cosine",
                    controlled.exactCosine.toFixed(3),
                    "Perfect alignment"
                )}

                ${metricCard(
                    "Extra-genre · cosine",
                    controlled.extraCosine.toFixed(3),
                    `Added: ${
                        controlled.addedGenres.join(", ") ||
                        "none"
                    }`
                )}

            </div>

        </div>


        <div class="metric-grid">

            ${metricCard(
                "Real-catalog overlap",
                `${overlap}/${TOP_K}`,
                "Dot vs cosine Top-5"
            )}

            ${metricCard(
                "Avg genres · dot",
                average(
                    dotRecommendations.map(
                        movie =>
                            movie.genres.length
                    )
                ).toFixed(2),
                "No normalization"
            )}

            ${metricCard(
                "Avg genres · cosine",
                average(
                    cosineRecommendations.map(
                        movie =>
                            movie.genres.length
                    )
                ).toFixed(2),
                "Length-normalized"
            )}

        </div>


        <div class="comparison-grid">

            ${miniRecommendationList(
                "Raw dot product",
                activeMovie.title,
                dotRecommendations,
                "dot"
            )}

            ${miniRecommendationList(
                "Cosine similarity",
                activeMovie.title,
                cosineRecommendations,
                "cosine"
            )}

        </div>


        <div class="analysis-box">

            <h3>
                What the normalization does
            </h3>

            <p>

                For binary genre vectors,
                the dot product counts shared active genres
                but does not penalize extra unmatched genres.

                Cosine divides by both vector norms,
                so a broader candidate receives
                a lower score unless its additional
                active dimensions are aligned
                with the query.

            </p>

        </div>
    `;
}


// ======================================================
// CONTROLLED NORMALIZATION EXAMPLE
// ======================================================

function buildControlledNormalizationExample(
    activeMovie
) {

    const exact =
        [...activeMovie.genreVector];


    const extra =
        [...activeMovie.genreVector];


    const zeroIndexes =
        extra

            .map(
                (
                    value,
                    index
                ) => ({

                    value,

                    index
                })
            )

            .filter(
                item =>
                    item.value === 0
            )

            .slice(
                0,
                3
            );


    zeroIndexes.forEach(
        item => {

            extra[item.index] =
                1;
        }
    );


    return {

        exactDot:
            dotProduct(
                activeMovie.genreVector,
                exact
            ),


        extraDot:
            dotProduct(
                activeMovie.genreVector,
                extra
            ),


        exactCosine:
            cosineSimilarity(
                activeMovie.genreVector,
                exact
            ),


        extraCosine:
            cosineSimilarity(
                activeMovie.genreVector,
                extra
            ),


        addedGenres:
            zeroIndexes.map(
                item =>
                    genreNames[
                        item.index
                    ]
            )
    };
}


// ======================================================
// RENDER FULL CATALOG BENCHMARK
// ======================================================

function renderCatalogBenchmark(
    container,
    benchmark
) {

    const observations =
        buildBenchmarkObservations(
            benchmark
        );


    container.innerHTML = `

        <div class="result-header">

            <div>

                <span class="eyebrow">
                    Full reproducible benchmark
                </span>

                <h3>

                    ${benchmark.usersEvaluated}
                    eligible users

                </h3>

                <p>

                    For each eligible user,
                    the three most recent positive ratings
                    (rating ≥ 4) form the history.

                    The most recent movie is used
                    as the active item.

                    Both methods exclude
                    all three watched movies.

                </p>

            </div>


            <div class="formula-chip">

                Ratings select histories;
                genres compute scores

            </div>

        </div>


        <div class="metric-grid">

            ${metricCard(
                "Item tail exposure",
                formatPercent(
                    benchmark.item.tailShare
                ),
                `${benchmark.item.exposures} recommendations`
            )}

            ${metricCard(
                "Profile tail exposure",
                formatPercent(
                    benchmark.profile.tailShare
                ),
                `${benchmark.profile.exposures} recommendations`
            )}

            ${metricCard(
                "Item catalog coverage",
                formatPercent(
                    benchmark.item.catalogCoverage
                ),
                `${benchmark.item.uniqueItems} unique movies`
            )}

            ${metricCard(
                "Profile catalog coverage",
                formatPercent(
                    benchmark.profile.catalogCoverage
                ),
                `${benchmark.profile.uniqueItems} unique movies`
            )}

        </div>


        <div class="table-wrap">

            <table class="analysis-table">

                <thead>

                    <tr>

                        <th>
                            Benchmark metric
                        </th>

                        <th>
                            Item-to-Item
                        </th>

                        <th>
                            Profile-Based
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${metricRow(
                        "Tail exposure",
                        formatPercent(
                            benchmark.item.tailShare
                        ),
                        formatPercent(
                            benchmark.profile.tailShare
                        )
                    )}

                    ${metricRow(
                        "Catalog coverage",
                        formatPercent(
                            benchmark.item.catalogCoverage
                        ),
                        formatPercent(
                            benchmark.profile.catalogCoverage
                        )
                    )}

                    ${metricRow(
                        "Unique recommended movies",
                        benchmark.item.uniqueItems,
                        benchmark.profile.uniqueItems
                    )}

                    ${metricRow(
                        "Mean popularity (# ratings)",
                        benchmark.item.meanPopularity.toFixed(1),
                        benchmark.profile.meanPopularity.toFixed(1)
                    )}

                    ${metricRow(
                        "Mean cosine similarity",
                        benchmark.item.meanSimilarity.toFixed(3),
                        benchmark.profile.meanSimilarity.toFixed(3)
                    )}

                </tbody>

            </table>

        </div>


        <div class="analysis-box">

            <h3>
                Observed in this benchmark
            </h3>


            <ul>

                ${
                    observations
                        .map(
                            text => `

                                <li>
                                    ${escapeHtml(text)}
                                </li>
                            `
                        )
                        .join("")
                }

            </ul>

        </div>


        <p class="method-note">

            This is an offline catalog-exposure diagnostic,
            not a claim about user satisfaction or retention.

            It evaluates recommendation exposure
            under the project's explicit Head/Tail definition.

        </p>
    `;
}


// ======================================================
// INTERPRETATIONS
// ======================================================

function buildComparisonObservations(
    itemMetrics,
    profileMetrics,
    overlap,
    overlapRate
) {

    const observations = [

        `The two Top-5 lists share ${overlap} movie(s), ` +
        `giving Overlap@5 = ${formatPercent(overlapRate)} ` +
        `in this scenario.`
    ];


    if (
        itemMetrics.tailShare >
        profileMetrics.tailShare
    ) {

        observations.push(

            "Item-to-Item exposes a larger " +
            "long-tail share in this scenario."
        );

    } else if (
        profileMetrics.tailShare >
        itemMetrics.tailShare
    ) {

        observations.push(

            "Profile-Based exposes a larger " +
            "long-tail share in this scenario."
        );

    } else {

        observations.push(

            "Both methods expose the same " +
            "long-tail share in this scenario."
        );
    }


    if (
        itemMetrics.meanPopularity <
        profileMetrics.meanPopularity
    ) {

        observations.push(

            "Item-to-Item recommendations are " +
            "less popular on average in this scenario."
        );

    } else if (
        profileMetrics.meanPopularity <
        itemMetrics.meanPopularity
    ) {

        observations.push(

            "Profile-Based recommendations are " +
            "less popular on average in this scenario."
        );

    } else {

        observations.push(

            "Both lists have the same mean " +
            "popularity in this scenario."
        );
    }


    return observations;
}


function buildBenchmarkObservations(
    benchmark
) {

    const observations =
        [];


    if (
        benchmark.item.tailShare >
        benchmark.profile.tailShare
    ) {

        observations.push(

            "Item-to-Item produces the higher " +
            "long-tail exposure in this benchmark."
        );

    } else if (
        benchmark.profile.tailShare >
        benchmark.item.tailShare
    ) {

        observations.push(

            "Profile-Based produces the higher " +
            "long-tail exposure in this benchmark."
        );

    } else {

        observations.push(

            "Both approaches produce the same " +
            "long-tail exposure in this benchmark."
        );
    }


    if (
        benchmark.item.catalogCoverage >
        benchmark.profile.catalogCoverage
    ) {

        observations.push(

            "Item-to-Item reaches a larger " +
            "fraction of the catalog."
        );

    } else if (
        benchmark.profile.catalogCoverage >
        benchmark.item.catalogCoverage
    ) {

        observations.push(

            "Profile-Based reaches a larger " +
            "fraction of the catalog."
        );

    } else {

        observations.push(

            "Both approaches have the same " +
            "catalog coverage."
        );
    }


    if (
        benchmark.item.meanPopularity <
        benchmark.profile.meanPopularity
    ) {

        observations.push(

            "Item-to-Item recommends " +
            "less-popular movies on average."
        );

    } else if (
        benchmark.profile.meanPopularity <
        benchmark.item.meanPopularity
    ) {

        observations.push(

            "Profile-Based recommends " +
            "less-popular movies on average."
        );

    } else {

        observations.push(

            "Both approaches have the same mean " +
            "recommendation popularity."
        );
    }


    return observations;
}


// ======================================================
// MINI TOP-5 LIST
// ======================================================

function miniRecommendationList(
    title,
    subtitle,
    recommendations,
    metric = "cosine"
) {

    return `

        <div class="mini-panel">

            <span class="eyebrow">

                ${escapeHtml(subtitle)}

            </span>


            <h3>
                ${escapeHtml(title)}
            </h3>


            <ol>

                ${
                    recommendations
                        .map(
                            movie => `

                                <li>

                                    <span>
                                        ${escapeHtml(movie.title)}
                                    </span>

                                    <strong>

                                        ${
                                            metric === "dot"

                                                ? movie.score.toFixed(0)

                                                : movie.score.toFixed(3)
                                        }

                                    </strong>

                                </li>
                            `
                        )
                        .join("")
                }

            </ol>

        </div>
    `;
}


// ======================================================
// SMALL UI HELPERS
// ======================================================

function metricRow(
    label,
    itemValue,
    profileValue
) {

    return `

        <tr>

            <td>

                <strong>
                    ${escapeHtml(label)}
                </strong>

            </td>

            <td>
                ${escapeHtml(String(itemValue))}
            </td>

            <td>
                ${escapeHtml(String(profileValue))}
            </td>

        </tr>
    `;
}


function metricCard(
    label,
    value,
    note
) {

    return `

        <div class="metric-card">

            <span>
                ${escapeHtml(label)}
            </span>

            <strong>
                ${escapeHtml(String(value))}
            </strong>

            <small>
                ${escapeHtml(note)}
            </small>

        </div>
    `;
}


function formatPercent(
    value
) {

    return (
        `${(value * 100).toFixed(0)}%`
    );
}


function formatGenres(
    genres
) {

    return (

        genres &&
        genres.length

            ? escapeHtml(
                genres.join(" · ")
            )

            : "—"
    );
}


function renderMessage(
    container,
    message,
    type = "info"
) {

    container.innerHTML = `

        <div
            class="
                inline-message
                ${type}
            "
        >

            ${escapeHtml(message)}

        </div>
    `;
}


function setStatus(
    element,
    message,
    type
) {

    element.textContent =
        message;


    element.className =
        `status ${type}`;
}


// ======================================================
// HTML SAFETY
// ======================================================

function escapeHtml(
    value
) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            "\"",
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


// ======================================================
// SANITY CHECKS
// ======================================================

function runSanityChecks() {

    console.assert(

        Math.abs(

            cosineSimilarity(

                [1, 0, 1],

                [1, 0, 1]
            )

            - 1

        ) < 1e-9,

        "Identical-vector cosine test failed"
    );


    console.assert(

        cosineSimilarity(

            [1, 0],

            [0, 1]

        ) === 0,

        "Orthogonal-vector cosine test failed"
    );


    console.assert(

        Math.abs(

            cosineSimilarity(

                [1, 2],

                [2, 4]
            )

            - 1

        ) < 1e-9,

        "Scale-invariance cosine test failed"
    );


    const profile =
        buildUserProfile([

            {
                genreVector:
                    [1, 0, 1]
            },

            {
                genreVector:
                    [1, 1, 0]
            }

        ]);


    console.assert(

        profile[0] === 1 &&
        profile[1] === 0.5 &&
        profile[2] === 0.5,

        "Profile averaging test failed"
    );


    console.log(
        "Sanity checks passed."
    );
}