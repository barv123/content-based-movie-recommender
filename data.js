// Global variables for storing movie and rating data
let movies = [];
let ratings = [];

// MovieLens contains 19 genre flags:
// unknown + 18 known genres.
// We use the 18 known genres for content-based filtering.
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


// ------------------------------------------------------
// Load MovieLens data
// ------------------------------------------------------

async function loadData() {
    try {
        // Reset arrays in case loadData() is called again
        movies = [];
        ratings = [];

        // ---------------------------
        // Load movie data
        // ---------------------------

        const moviesResponse = await fetch("u.item");

        if (!moviesResponse.ok) {
            throw new Error(
                `Failed to load movie data: ${moviesResponse.status}`
            );
        }

        const moviesText = await moviesResponse.text();

        parseItemData(moviesText);


        // ---------------------------
        // Load rating data
        // ---------------------------

        const ratingsResponse = await fetch("u.data");

        if (!ratingsResponse.ok) {
            throw new Error(
                `Failed to load rating data: ${ratingsResponse.status}`
            );
        }

        const ratingsText = await ratingsResponse.text();

        parseRatingData(ratingsText);


        console.log(
            `Loaded ${movies.length} movies and ${ratings.length} ratings.`
        );

    } catch (error) {

        console.error("Error loading data:", error);

        const resultElement =
            document.getElementById("result");

        if (resultElement) {

            resultElement.textContent =
                `Error: ${error.message}. ` +
                `Please make sure u.item and u.data ` +
                `are in the same folder as index.html.`;

            resultElement.className = "error";
        }

        throw error;
    }
}


// ------------------------------------------------------
// Parse MovieLens u.item
// ------------------------------------------------------

function parseItemData(text) {

    const lines = text.split("\n");

    for (const line of lines) {

        if (line.trim() === "") {
            continue;
        }

        const fields = line.split("|");


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
        ...
        23 Western
        */

        if (fields.length < 24) {

            console.warn(
                "Skipping malformed movie row:",
                line
            );

            continue;
        }


        const id =
            parseInt(fields[0], 10);

        const title =
            fields[1];


        if (Number.isNaN(id) || !title) {

            console.warn(
                "Skipping invalid movie row:",
                line
            );

            continue;
        }


        // ----------------------------------
        // Handle the "unknown" genre flag
        // ----------------------------------

        const unknownGenre =
            parseInt(fields[5], 10) === 1;


        // ----------------------------------
        // IMPORTANT FIX
        //
        // Known genres are fields 6..23.
        //
        // Therefore we use:
        // slice(6, 24)
        //
        // NOT slice(5, 24)
        // ----------------------------------

        const genreVector =
            fields
                .slice(6, 24)
                .map(
                    value =>
                        parseInt(value, 10)
                );


        // We expect exactly 18 features
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


        // Convert the binary vector
        // into readable genre names
        const genres =
            genreNames.filter(
                (_, index) =>
                    genreVector[index] === 1
            );


        // Store both:
        //
        // genres      -> useful for UI
        // genreVector -> useful for cosine similarity

        movies.push({
            id,
            title,
            genres,
            genreVector,
            unknownGenre
        });
    }
}


// ------------------------------------------------------
// Parse MovieLens u.data
// ------------------------------------------------------

function parseRatingData(text) {

    const lines =
        text.split("\n");

    for (const line of lines) {

        if (line.trim() === "") {
            continue;
        }

        const fields =
            line.split("\t");


        if (fields.length < 4) {

            console.warn(
                "Skipping malformed rating row:",
                line
            );

            continue;
        }


        const userId =
            parseInt(fields[0], 10);

        const itemId =
            parseInt(fields[1], 10);

        const rating =
            parseFloat(fields[2]);

        const timestamp =
            parseInt(fields[3], 10);


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