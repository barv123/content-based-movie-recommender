// ======================================================
// MOVIELENS DATA LOADER
// ======================================================

// Global variables for storing movie and rating data
let movies = [];
let ratings = [];


// MovieLens contains 19 genre flags:
// unknown + 18 known genres.
//
// We use only the 18 known genres
// as content features for recommendation.
const genreNames = [
    "Action",
    "Adventure",
    "Animation",
    "Children's",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Fantasy",
    "Film-Noir",
    "Horror",
    "Musical",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Thriller",
    "War",
    "Western"
];


// ======================================================
// LOAD MOVIELENS DATA
// ======================================================

async function loadData() {

    try {

        // Reset arrays in case loadData()
        // is called more than once.
        movies = [];
        ratings = [];


        // ==================================================
        // LOAD MOVIE DATA
        //
        // IMPORTANT:
        // MovieLens 100K u.item uses an old Latin-1
        // compatible encoding rather than UTF-8.
        //
        // Reading it with response.text() may replace
        // accented characters with �.
        //
        // Therefore we read raw bytes and decode them
        // explicitly.
        // ==================================================

        const moviesResponse =
            await fetch("u.item");


        if (!moviesResponse.ok) {

            throw new Error(
                `Failed to load movie data: ${moviesResponse.status}`
            );
        }


        const moviesBuffer =
            await moviesResponse.arrayBuffer();


        const moviesDecoder =
            new TextDecoder(
                "iso-8859-1"
            );


        const moviesText =
            moviesDecoder.decode(
                moviesBuffer
            );


        parseItemData(
            moviesText
        );


        // ==================================================
        // LOAD RATING DATA
        //
        // u.data contains numeric / ASCII data,
        // so normal text decoding is sufficient.
        // ==================================================

        const ratingsResponse =
            await fetch("u.data");


        if (!ratingsResponse.ok) {

            throw new Error(
                `Failed to load rating data: ${ratingsResponse.status}`
            );
        }


        const ratingsText =
            await ratingsResponse.text();


        parseRatingData(
            ratingsText
        );


        console.log(
            `Loaded ${movies.length} movies and ${ratings.length} ratings.`
        );


    } catch (error) {

        console.error(
            "Error loading data:",
            error
        );


        const resultElement =
            document.getElementById(
                "result"
            );


        if (resultElement) {

            resultElement.textContent =
                `Error: ${error.message}. ` +
                `Please make sure u.item and u.data ` +
                `are in the same folder as index.html.`;


            resultElement.className =
                "error";
        }


        throw error;
    }
}


// ======================================================
// PARSE MOVIELENS u.item
// ======================================================

function parseItemData(
    text
) {

    const lines =
        text.split(
            /\r?\n/
        );


    for (
        const line
        of lines
    ) {

        if (
            line.trim() === ""
        ) {

            continue;
        }


        const fields =
            line.split("|");


        /*
        MovieLens u.item structure:

        0  movie id
        1  movie title
        2  release date
        3  video release date
        4  IMDb URL

        Genre flags:

        5  unknown
        6  Action
        7  Adventure
        8  Animation
        9  Children's
        10 Comedy
        11 Crime
        12 Documentary
        13 Drama
        14 Fantasy
        15 Film-Noir
        16 Horror
        17 Musical
        18 Mystery
        19 Romance
        20 Sci-Fi
        21 Thriller
        22 War
        23 Western
        */


        if (
            fields.length < 24
        ) {

            console.warn(
                "Skipping malformed movie row:",
                line
            );

            continue;
        }


        const id =
            parseInt(
                fields[0],
                10
            );


        const title =
            fields[1];


        if (
            Number.isNaN(id) ||
            !title
        ) {

            console.warn(
                "Skipping invalid movie row:",
                line
            );

            continue;
        }


        // ==================================================
        // UNKNOWN GENRE
        // ==================================================

        const unknownGenre =

            parseInt(
                fields[5],
                10
            ) === 1;


        // ==================================================
        // KNOWN GENRE VECTOR
        //
        // Known genres occupy fields 6..23.
        //
        // slice(6, 24) gives exactly 18 features.
        // ==================================================

        const genreVector =

            fields
                .slice(
                    6,
                    24
                )

                .map(
                    value =>
                        parseInt(
                            value,
                            10
                        )
                );


        if (
            genreVector.length !==
            genreNames.length
        ) {

            console.warn(
                "Invalid genre vector length:",
                title
            );

            continue;
        }


        // ==================================================
        // READABLE GENRE LABELS
        // ==================================================

        const genres =

            genreNames.filter(
                (
                    _,
                    index
                ) =>

                    genreVector[
                        index
                    ] === 1
            );


        // ==================================================
        // STORE MOVIE
        // ==================================================

        movies.push({

            id,

            title,

            genres,

            genreVector,

            unknownGenre
        });
    }
}


// ======================================================
// PARSE MOVIELENS u.data
// ======================================================

function parseRatingData(
    text
) {

    const lines =
        text.split(
            /\r?\n/
        );


    for (
        const line
        of lines
    ) {

        if (
            line.trim() === ""
        ) {

            continue;
        }


        const fields =
            line.split(
                "\t"
            );


        if (
            fields.length < 4
        ) {

            console.warn(
                "Skipping malformed rating row:",
                line
            );

            continue;
        }


        const userId =
            parseInt(
                fields[0],
                10
            );


        const itemId =
            parseInt(
                fields[1],
                10
            );


        const rating =
            parseFloat(
                fields[2]
            );


        const timestamp =
            parseInt(
                fields[3],
                10
            );


        if (
            Number.isNaN(userId) ||
            Number.isNaN(itemId) ||
            Number.isNaN(rating) ||
            Number.isNaN(timestamp)
        ) {

            console.warn(
                "Skipping invalid rating row:",
                line
            );

            continue;
        }


        ratings.push({

            userId,

            itemId,

            rating,

            timestamp
        });
    }
}
