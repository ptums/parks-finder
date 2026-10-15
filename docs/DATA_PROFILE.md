# Data Profile: `db/parks.sample.json`

The orchestrator generated this profile on 2026-10-02 with a one-off `node -e` script. The output is reproduced below. The script is in the session transcript.

## Shape

- The file is a top-level JSON array of 12 parks.
- Every record has all 9 keys: `id, name, description, location, amenities, hours, images, acreage, rating`.
- In this file, "missing" means one of two things:
  - The key is present, but its value is `null` or empty.
  - For `address` only: the key is absent from `location`.
- No two records have the same id or the same name. All ids are kebab-case slugs.

## Per-field coverage

| Field              | Missing / null / empty | Which park                                           | Notes                                                                                                              |
| ------------------ | ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| id, name           | 0                      |                                                      |                                                                                                                    |
| description        | 1                      | `old-mill-botanical-garden` (`null`)                 | The other descriptions are 80-168 characters.                                                                      |
| location.lat / lng | 0                      |                                                      | All are numbers. All are in range.                                                                                 |
| location.address   | 1                      | `highland-dog-park` (key absent)                     | Most addresses are partial: street only, no city or ZIP. Examples: "Ridge Rd", "44th St & 7th Ave". Show verbatim. |
| amenities          | 0 null, 0 empty        |                                                      | Always an array.                                                                                                   |
| hours              | 0                      |                                                      | Always a non-empty string. The value is free text (see below).                                                     |
| images             | 2 empty arrays         | `cedar-hill-nature-preserve`, `east-ridge-trailhead` |                                                                                                                    |
| acreage            | 0                      |                                                      | Range 2-640.                                                                                                       |
| rating             | 1 (`null`)             | `cedar-hill-nature-preserve`                         | Range 3.9-4.9. The scale is not stated. Assume "out of 5".                                                         |

`cedar-hill-nature-preserve` is the sparsest record. It has no images and no rating. No single record is missing every optional field. Thus, component tests need a synthetic "everything missing" fixture.

## Oddities that matter

1. **Images never load.** All 12 image URLs are on `images.example.com`. This is a reserved domain that does not serve images. Every image that the app renders goes to the failure path. The placeholder is the normal case, not an edge case.
2. **Hours are free text.** Examples: `"6:00 AM - 1:00 AM"` (this range crosses midnight), `"Dawn to dusk"`, `"24 hours"`, and several `H:MM AM - H:MM PM` ranges. Show the hours verbatim. Do not compute "open now".
3. **Suspicious coordinate.** `cedar-hill-nature-preserve` is at `40.7128, -74.0060`. This is the usual "New York City" default point (lower Manhattan, City Hall area). It is not a nature preserve. The value is probably placeholder data. Show it as given. Note it in the README assumptions.
4. **Location.** All parks are in the NYC area (lat 40.58-40.85, lng -74.09 to -73.79). Some are real NYC parks, for example Prospect Park. Most are fictional. Municipality choice: "NYC-area (fictional mix)".
5. **Descriptions repeat other fields.** For example, the Prospect Park description says "526-acre". The same value is in `acreage`. We found no conflict.
6. **Local photos (derived file).** Because of item 1, `db/park-images.json` maps 10 park ids to files in `images/`, with alt text. The loader overlays this file at load time. `db/parks.sample.json` stays unchanged. Two parks have no photo: `cedar-hill-nature-preserve` and `east-ridge-trailhead`. `memorial.jpg` is not used, because it shows a real, different stadium.

## Amenity vocabulary (26 distinct slugs, count of parks)

restrooms 8 · trails 6 · parking 6 · playground 3 · wildlife-viewing 3 · accessible-paths 3 · dog-run 2 · picnic-areas 2 · waterfront 2 · lake 1 · bike-path 1 · splash-pad 1 · basketball 1 · water-fountain 1 · sports-fields 1 · gardens 1 · cafe 1 · gift-shop 1 · fishing 1 · kayak-launch 1 · event-lawn 1 · wifi 1 · food-vendors 1 · boardwalk 1 · skate-park 1 · lighting 1

All slugs are lowercase kebab-case. Thus, the app needs a slug -> label map, for example `dog-run` -> "Dog run". An unknown slug should fall back to a mechanical title case. An unknown slug should never be dropped.

## Hours values (distinct)

`6:00 AM - 1:00 AM`, `6:00 AM - 10:00 PM`, `Dawn to dusk`, `8:00 AM - 8:00 PM`, `6:00 AM - 9:00 PM`, `7:00 AM - 11:00 PM`, `9:00 AM - 5:00 PM`, `24 hours`, `8:00 AM - 10:00 PM`
