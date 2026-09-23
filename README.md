# Content-Based Movie Recommender Lab

**Live Demo:** [Open the interactive recommender](https://barv123.github.io/content-based-movie-recommender/)

A browser-based experimental recommender system built on the **MovieLens 100K** dataset.

The project implements and compares two content-based recommendation strategies:

1. **Item-to-Item Recommendation**
2. **Profile-Based Recommendation**

Both approaches use **cosine similarity** over movie genre features.

In addition to generating Top-5 recommendations, the application includes explainability, model comparison, cosine-normalization analysis, and a full catalog-discovery benchmark.

---

## 1. Project Objective

The objective of this project is to study how different forms of content-based recommendation behave when the same movie catalog is represented through metadata features.

The project addresses four main questions:

1. How can cosine similarity be used to retrieve movies similar to a currently active item?
2. How does an aggregated user profile differ from recommendation based on a single active movie?
3. Why is cosine normalization preferable to an unnormalized dot product for multi-feature items?
4. Which recommendation strategy provides stronger long-tail exposure and catalog discovery in this dataset?

The application therefore goes beyond generating recommendations and provides an experimental environment for comparing recommendation behavior.

---

## 2. Dataset

The project uses the **MovieLens 100K** dataset.

Dataset size:

- **1,682 movies**
- **100,000 ratings**
- **943 users**
- Ratings on a **1–5 scale**

Two files are used:

- `u.item` — movie metadata and genre indicators
- `u.data` — user ratings and timestamps

### Important methodological distinction

Movie recommendations themselves are calculated exclusively from **movie content features**.

The rating data are used only for:

- measuring movie popularity;
- defining Head and Tail catalog segments;
- constructing historical user profiles for the offline benchmark.

Therefore, the recommendation algorithm remains **content-based rather than collaborative filtering**.

---

## 3. Data Encoding

MovieLens 100K `u.item` contains non-ASCII movie titles and uses a legacy Latin-1-compatible encoding.

To preserve titles correctly, the file is loaded as raw bytes and decoded explicitly with:

```javascript
new TextDecoder("iso-8859-1")
```

This avoids corrupted characters in titles such as:

```text
Á köldum klaka (Cold Fever) (1994)
```

The ratings file `u.data` contains numeric / ASCII content and is read normally.

---

## 4. Content Representation

Each movie is represented by an **18-dimensional binary genre vector**.

The known genre dimensions are:

- Action
- Adventure
- Animation
- Children's
- Comedy
- Crime
- Documentary
- Drama
- Fantasy
- Film-Noir
- Horror
- Musical
- Mystery
- Romance
- Sci-Fi
- Thriller
- War
- Western

For each genre:

- `1` means that the movie belongs to the genre;
- `0` means that it does not.

For example, a simplified representation could be:

```text
[Action, Adventure, Comedy, Drama, Sci-Fi]

[1, 1, 0, 0, 1]
```

This converts movie metadata into a numerical feature space in which similarity can be calculated.

---

## 5. Cosine Similarity

Similarity between two content vectors is calculated using cosine similarity:

\[
\text{cosine}(x,y)
=
\frac{x \cdot y}
{\|x\|\|y\|}
\]

where:

- \(x \cdot y\) is the dot product;
- \(\|x\|\) and \(\|y\|\) are vector norms.

For the binary genre vectors used in this project:

- values near `1.0` indicate highly aligned genre profiles;
- intermediate values indicate partial genre overlap;
- `0` indicates no aligned active genre features.

The value shown in the interface as **Similarity score** is this cosine similarity.

It is a similarity measure between feature vectors.

---

# 6. Item-to-Item Recommendation

The Item-to-Item model represents the user's immediate context through one selected **active movie**.

For active movie \(t\) and candidate movie \(i\):

\[
score(i|t)
=
cos(x_t, x_i)
\]

The system:

1. reads the genre vector of the selected movie;
2. compares it with every candidate movie;
3. excludes the active movie itself;
4. ranks candidates by cosine similarity;
5. returns the **Top-5** recommendations.

Equal similarity scores are resolved alphabetically to make ranking deterministic and reproducible.

---

## 6.1 Example: Toy Story (1995)

For the demonstration scenario, the active movie is:

**Toy Story (1995)**

MovieLens genres:

```text
Animation · Children's · Comedy
```

Top-5 Item-to-Item recommendations:

| Rank | Movie | Similarity |
|---:|---|---:|
| 1 | Aladdin and the King of Thieves (1996) | 1.000 |
| 2 | Aladdin (1992) | 0.866 |
| 3 | A Goofy Movie (1995) | 0.866 |
| 4 | 101 Dalmatians (1996) | 0.816 |
| 5 | Air Bud (1997) | 0.816 |

The first recommendation has similarity `1.000` because its active genre vector is identical to the Toy Story genre vector in the features used by this model.

This illustrates an important limitation of genre-only representations: two different movies can become indistinguishable when they have the same metadata vector.

---

# 7. Profile-Based Recommendation

A single active movie represents immediate context, but it may not reflect the user's broader preferences.

The Profile-Based model therefore constructs a user representation from multiple watched movies.

For three watched movies:

\[
p_u
=
\frac{x_1+x_2+x_3}{3}
\]

where \(p_u\) is the user-profile vector.

Candidate movies are then scored as:

\[
score(i|u)
=
cos(p_u,x_i)
\]

The three watched movies are excluded from the recommendation candidates.

---

## 7.1 Demonstration User Profile

The demonstration history contains:

1. **Star Wars (1977)**
2. **The Empire Strikes Back (1980)**
3. **Return of the Jedi (1983)**

The resulting learned profile is:

| Genre | Weight |
|---|---:|
| Action | 1.00 |
| Adventure | 1.00 |
| Romance | 1.00 |
| Sci-Fi | 1.00 |
| War | 1.00 |
| Drama | 0.33 |

A weight of `1.00` means that the genre is present in all three selected movies.

A weight of approximately `0.33` means that it is present in one of the three.

### Top-5 Profile-Based Recommendations

| Rank | Movie | Similarity |
|---:|---|---:|
| 1 | The African Queen (1951) | 0.885 |
| 2 | Starship Troopers (1997) | 0.885 |
| 3 | Cutthroat Island (1995) | 0.766 |
| 4 | Independence Day (ID4) (1996) | 0.766 |
| 5 | Judge Dredd (1995) | 0.766 |

This recommendation list is very different from the Toy Story Item-to-Item list because it represents a different signal: **aggregated user taste rather than the currently active item**.

---

# 8. Item-to-Item vs Profile-Based Comparison

The demonstration scenario intentionally contrasts:

### Immediate context

```text
Active item:
Toy Story (1995)
```

with:

### Aggregated taste

```text
Star Wars (1977)

Empire Strikes Back, The (1980)

Return of the Jedi (1983)
```

This produces the following comparison:

| Metric | Item-to-Item | Profile-Based |
|---|---:|---:|
| Mean cosine similarity | 0.873 | 0.814 |
| Mean popularity (# ratings) | 83.4 | 169.8 |
| Long-tail share | 60% | 40% |
| Genre coverage in Top-5 | 5 | 5 |
| Overlap@5 | 0 / 5 | 0 / 5 |

### Overlap@5

The recommendation lists share **zero movies**:

\[
Overlap@5 = 0\%
\]

This is not treated as an error.

It demonstrates that a recommendation based on the currently active item may represent a substantially different intent from a recommendation generated from aggregated viewing history.

In this scenario:

- Item-to-Item follows Toy Story's animation / children's / comedy context;
- Profile-Based follows the action / adventure / science-fiction-oriented historical profile.

The two mechanisms therefore model different recommendation contexts.

---

# 9. Cosine Normalization Diagnostic

The project also compares **raw dot product** and **cosine similarity**.

This experiment demonstrates why normalization matters when candidates contain different numbers of active features.

---

## 9.1 Controlled Example

Toy Story contains three active genre dimensions:

```text
Animation
Children's
Comedy
```

An exact-match vector therefore has:

```text
Dot product = 3
Cosine      = 1.000
```

The experiment then creates a synthetic candidate that preserves all three matching genres while adding three unrelated active genres:

```text
Action
Adventure
Crime
```

The result becomes:

```text
Exact match dot product       = 3
Extra-genre dot product       = 3

Exact match cosine similarity = 1.000
Extra-genre cosine similarity = 0.707
```

The dot product cannot distinguish the two candidates because both contain all three active Toy Story genres.

Cosine similarity does distinguish them because it normalizes vector magnitude.

The extra unmatched dimensions increase the candidate vector norm and reduce similarity.

---

## 9.2 Real-Catalog Effect

For the Toy Story example:

```text
Dot-product vs cosine Top-5 overlap = 3 / 5
```

The average number of active genres among Top-5 recommendations was:

```text
Raw dot product:     4.20 genres
Cosine similarity:   3.00 genres
```

Example raw dot-product ranking:

1. Aladdin
2. Aladdin and the King of Thieves
3. A Goofy Movie
4. Hercules
5. Space Jam

Cosine ranking:

1. Aladdin and the King of Thieves
2. Aladdin
3. A Goofy Movie
4. 101 Dalmatians
5. Air Bud

This provides both a controlled mathematical example and evidence that normalization changes ranking behavior in the real catalog.

---

# 10. Popularity, Head and Long Tail

To analyze catalog discovery, movie popularity is measured by the number of ratings in `u.data`.

For this project an explicit operational definition is used.

### Head / popular

Top **20%** of movies ranked by rating count:

```text
337 movies
```

### Tail / long-tail

Remaining **80%** of the catalog:

```text
1,345 movies
```

This 20/80 split is an experimental definition used in this project rather than an intrinsic MovieLens label.

A Tail movie therefore means:

> a movie belonging to the less frequently rated 80% of the MovieLens 100K catalog under this project's definition.

It does not necessarily mean that the movie is obscure outside the dataset.

---

# 11. Full Catalog Discovery Benchmark

A single hand-selected example is useful for interpretation but insufficient for making broader observations about catalog exposure.

The project therefore includes a reproducible offline benchmark over **all eligible MovieLens users**.

---

## 11.1 User Selection

A rating is treated as a positive historical interaction when:

\[
rating \geq 4
\]

A user is eligible when at least three positive interactions with valid movie genre vectors are available.

This produces:

```text
942 eligible users
```

For each eligible user:

1. positive ratings are ordered by timestamp;
2. the three most recent positive movies form the history;
3. the most recent movie is used as the Item-to-Item active item;
4. all three watched movies are excluded from recommendation candidates;
5. both approaches return Top-5 recommendations.

With 942 users and five recommendations per model:

\[
942 \times 5 = 4710
\]

Therefore each approach generates:

```text
4,710 recommendation exposures
```

---

# 12. Full Benchmark Results

| Metric | Item-to-Item | Profile-Based |
|---|---:|---:|
| Eligible users | 942 | 942 |
| Recommendation exposures | 4,710 | 4,710 |
| Tail exposure | **72%** | **62%** |
| Catalog coverage | **28%** | **25%** |
| Unique recommended movies | **474** | **418** |
| Mean popularity (# ratings) | **74.8** | **95.2** |
| Mean cosine similarity | **0.966** | **0.850** |

---

## 12.1 Long-Tail Exposure

Item-to-Item:

```text
72%
```

Profile-Based:

```text
62%
```

Under the project's Head/Tail definition, Item-to-Item produced more long-tail exposure in this benchmark.

---

## 12.2 Catalog Coverage

Catalog coverage is calculated as:

\[
Coverage
=
\frac{\text{unique recommended movies}}
{\text{total movies in catalog}}
\]

Results:

```text
Item-to-Item:
474 unique movies
≈ 28% catalog coverage

Profile-Based:
418 unique movies
≈ 25% catalog coverage
```

The Item-to-Item approach reached a larger fraction of the available catalog in this experiment.

---

## 12.3 Recommendation Popularity

Mean number of MovieLens ratings among recommended movies:

```text
Item-to-Item:  74.8
Profile-Based: 95.2
```

Thus Item-to-Item recommendations were less popular on average under this benchmark configuration.

This result is consistent with its higher observed Tail exposure.

---

## 12.4 Mean Similarity

Mean recommendation cosine similarity:

```text
Item-to-Item:  0.966
Profile-Based: 0.850
```

One reason is structural.

Item-to-Item compares a candidate against one concrete binary movie vector, while Profile-Based recommendation compares candidates against an averaged centroid containing fractional weights across several genres.

The two scores therefore represent related but not identical recommendation contexts.

---

# 13. Interpretation

The experiments highlight a useful distinction between the two recommendation strategies.

## Item-to-Item

Item-to-Item recommendation is strongly anchored to the currently active object.

In the full benchmark it produced:

- higher mean cosine similarity;
- higher long-tail exposure;
- broader catalog coverage;
- lower average recommendation popularity.

This makes it suitable for contexts where immediate item similarity is important.

---

## Profile-Based

Profile-Based recommendation aggregates several historical interactions and therefore creates a more stable representation of broader user taste.

It can recommend content that is less directly related to the current item while still aligning with the historical profile.

This makes it suitable for contexts where persistent preferences matter more than immediate session context.

---

## Complementary rather than interchangeable

The experiment does not establish that one method is universally superior.

Instead, the methods encode different signals:

```text
Item-to-Item
→ current item / immediate context

Profile-Based
→ aggregated historical preference
```

A production recommender system could use these signals separately or combine them depending on product context.

---

# 14. Business Interpretation

Catalog discovery matters because a recommendation system that repeatedly concentrates exposure on the same highly popular items may underuse the available catalog.

In this experiment, Item-to-Item recommendation generated:

- greater long-tail exposure;
- greater catalog coverage;
- lower average item popularity.

These results suggest stronger catalog-discovery behavior under this dataset and experimental design.

However, the benchmark measures **recommendation exposure**, not downstream user behavior.

It does not directly measure:

- clicks;
- watch time;
- satisfaction;
- conversion;
- retention.

Therefore, no causal claim about user retention or business performance is made from this offline experiment alone.

In a production environment, such hypotheses should be validated using online evaluation or A/B testing.

---

# 15. Explainability

The application exposes the internal logic of recommendations rather than displaying only movie titles.

For Item-to-Item recommendations it displays:

- movie genres;
- shared genres with the active item;
- similarity score;
- number of ratings;
- Head / popular or Tail / long-tail status.

For Profile-Based recommendations it additionally displays:

- learned user-profile weights;
- profile features matched by each candidate.

This makes recommendation behavior easier to inspect, explain, and debug.

---

# 16. Computational Optimization

The full benchmark evaluates:

```text
942 users
× 2 recommendation strategies
× approximately 1,682 candidate movies
```

A naive implementation could repeatedly:

1. calculate similarity for every candidate;
2. allocate a full candidate array;
3. sort the complete catalog;
4. retain only the first five items.

The final implementation keeps the mathematical ranking logic unchanged while improving execution efficiency through:

- cached movie feature-vector norms;
- pre-built movie lookup indexes;
- incremental Top-5 maintenance instead of full catalog sorting during the benchmark;
- incremental metric aggregation;
- batched browser execution with progress updates.

These changes improve runtime and browser responsiveness without changing the recommendation methodology.

The ranking function itself remains based on cosine similarity.

A later correction to MovieLens title decoding can affect deterministic alphabetical tie-breaking among candidates with identical similarity scores, because correctly decoded titles may sort differently from corrupted strings.

This can slightly change exposure-based metrics while leaving the similarity function itself unchanged.

---

# 17. Limitations

## 17.1 Coarse genre representation

The model uses only 18 binary genre features.

It does not consider:

- directors;
- actors;
- plot descriptions;
- keywords;
- visual style;
- language;
- learned text embeddings.

Consequently, movies with identical genre vectors are indistinguishable to the Item-to-Item model.

This explains why several different movies can legitimately receive a similarity score of `1.000`.

---

## 17.2 Equal weighting of genres

Every genre dimension has the same importance.

For example:

```text
Comedy = 1
Drama  = 1
Sci-Fi = 1
```

The model does not learn that one feature may be more informative than another.

Possible extensions include weighted metadata, TF-IDF-style weighting, or learned embeddings.

---

## 17.3 Equal weighting of profile history

The three movies used in the Profile-Based model are averaged equally.

The system does not currently weight interactions according to:

- recency beyond history selection;
- rating strength beyond the positive-interaction threshold;
- interaction frequency;
- explicit user preference.

A more sophisticated profile could use weighted averaging.

---

## 17.4 Head/Tail definition

The Head/Tail split is an explicit project-level operational choice:

```text
Top 20% most-rated movies → Head
Remaining 80%            → Tail
```

Alternative thresholds would produce different absolute exposure values.

The threshold should therefore always be reported together with benchmark results.

---

## 17.5 Offline benchmark

The benchmark evaluates catalog exposure and recommendation characteristics.

It is not an online user study and cannot directly establish effects on:

- satisfaction;
- engagement;
- retention;
- conversion.

---

# 18. Reproducibility

The application uses deterministic ranking.

When multiple movies have exactly the same similarity score, ties are resolved alphabetically.

The benchmark also uses a deterministic definition of user history:

1. keep positive interactions where `rating >= 4`;
2. sort them by timestamp;
3. select the three most recent unique movies.

This means that the same dataset, encoding, implementation, and ranking rules produce reproducible experimental results.

---

# 19. Technology

The application intentionally uses a minimal technology stack:

- HTML
- CSS
- Vanilla JavaScript
- MovieLens `u.item`
- MovieLens `u.data`

No external recommendation API is required.

No external movie service is used.

No external recommendation library is required.

This keeps the project fully local, transparent, and reproducible.

---

# 20. Project Structure

```text
content-based-movie-recommender/
│
├── index.html
├── style.css
├── data.js
├── script.js
├── README.md
├── u.item
└── u.data
```

### `index.html`

Defines the application interface and experimental sections.

### `style.css`

Contains the application styling.

### `data.js`

Loads and parses MovieLens movie and rating data, including explicit Latin-1 decoding for `u.item`.

### `script.js`

Contains:

- cosine similarity;
- dot product;
- Item-to-Item recommendation;
- Profile-Based recommendation;
- user-profile construction;
- recommendation explainability;
- popularity analysis;
- Head/Tail segmentation;
- model comparison;
- normalization diagnostics;
- full catalog benchmark;
- benchmark optimization;
- sanity checks.

### `u.item`

Movie metadata and genre indicators.

### `u.data`

User ratings and timestamps.

---

# 21. How to Run Locally

Because the application loads local dataset files through `fetch()`, it should be opened through a local web server rather than by double-clicking `index.html`.

One simple option is **Visual Studio Code + Live Server**.

## Steps

1. Open the project folder in Visual Studio Code.
2. Install the **Live Server** extension if necessary.
3. Open `index.html`.
4. Start Live Server.
5. Open the local application in the browser.

Example local address:

```text
http://127.0.0.1:5500/index.html
```

The application should report:

```text
1682 movies · 100000 ratings · 18 genre features · Top-5
```

---

# 22. Online Demo

The project is also deployed through GitHub Pages.

**Live application:**

https://barv123.github.io/content-based-movie-recommender/

The deployed version uses the same repository files and dataset as the local version.

---

# 23. Recommended Demonstration Scenario

A useful scenario for demonstrating the difference between the two recommendation modes is:

## Section 01 — Item-to-Item

```text
Toy Story (1995)
```

## Section 02 — Profile-Based history

```text
Star Wars (1977)

Empire Strikes Back, The (1980)

Return of the Jedi (1983)
```

Then run:

1. **Run Item-to-Item Top-5**
2. **Build Profile & Recommend Top-5**
3. **Compare Current Selections**
4. **Analyze Dot Product vs Cosine**
5. **Run Full Catalog Benchmark**

This scenario clearly demonstrates the difference between immediate item context and aggregated historical preference.

---

# 24. Main Findings

The implementation and experiments lead to five main observations.

### 1. Cosine similarity produces interpretable content-based rankings

Recommendations can be explained directly through overlapping movie genre features.

### 2. Item-to-Item and Profile-Based recommendation capture different contexts

The demonstration scenario produced:

```text
Overlap@5 = 0%
```

showing that immediate content context and historical taste can result in substantially different recommendation lists.

### 3. Cosine normalization changes ranking behavior

The controlled experiment shows that raw dot product can give the same score to an exact match and a candidate containing additional unrelated genres, while cosine similarity penalizes unmatched active dimensions through normalization.

### 4. Item-to-Item generated stronger catalog discovery in the full benchmark

Across 942 eligible users:

```text
Tail exposure:

72% Item-to-Item
62% Profile-Based


Catalog coverage:

28% Item-to-Item
25% Profile-Based


Unique recommended movies:

474 Item-to-Item
418 Profile-Based


Mean popularity:

74.8 Item-to-Item
95.2 Profile-Based
```

### 5. Content representation limits recommendation quality

Genre-only features are transparent and easy to interpret, but they are coarse.

Identical metadata vectors produce identical similarity values even when movies differ substantially in story, style, audience, or other semantic characteristics.

---

# 25. Conclusion

This project demonstrates that content-based recommendation is not only a similarity-computation problem but also a **representation and context problem**.

Item-to-Item and Profile-Based systems use the same movie features and the same cosine similarity function, yet they can produce very different outputs because they represent user intent differently.

The full benchmark additionally shows that recommendation strategy can affect:

- long-tail exposure;
- popularity concentration;
- catalog coverage.

The normalization experiment demonstrates why cosine similarity is useful when items contain different numbers of active features.

Finally, the project shows that small implementation details such as feature representation, deterministic tie-breaking, and correct dataset decoding can influence reproducibility and catalog-level evaluation.

The resulting application provides a reproducible framework for both generating content-based recommendations and analyzing their algorithmic and catalog-level behavior.
