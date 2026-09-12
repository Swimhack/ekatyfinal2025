# Restaurant dashboard API authorization

`/api/restaurant-dashboard/*` is an owner-only surface. Every handler calls
`authorizeRestaurantAccess(restaurantId)` from `lib/auth/restaurant-access.ts`
before touching the database:

| Caller | Result |
| --- | --- |
| No session cookies | `401 Unauthorized` |
| Signed in, no `RestaurantOwner` row for the listing | `403 Forbidden` |
| Signed in, `RestaurantOwner` row with `verified: false` | `403 Forbidden` |
| Signed in, `RestaurantOwner` row with `verified: true` | allowed |
| Signed in with role `ADMIN` or `EDITOR` | allowed |

Verified ownership rows are created by the claim approval flow in
`/api/claims/[id]`. Sessions come from the existing `getCurrentUser()` helper
(`ekaty_session` + `ekaty_user_id` cookies), the same mechanism used by
`/api/admin/*` and `/api/owner/restaurants`.

Gated routes:

- `GET`/`PATCH /api/restaurant-dashboard/[id]`
- `POST /api/restaurant-dashboard/[id]/events`
- `POST /api/restaurant-dashboard/[id]/reviews/[reviewId]`

`GET` is gated as well because the dashboard payload is management data about a
private listing, and the review query no longer selects reviewer email
addresses.

## Regression test

```bash
npx jest tests/unit/restaurant-dashboard-auth.test.ts
```

## Live smoke

Anonymous `PATCH` must be rejected with `401` and must not change the listing:

```bash
BASE_URL=https://www.ekaty.com
RESTAURANT_ID=<listing id>

# 1. Record the current value
curl -s "$BASE_URL/api/restaurants/$RESTAURANT_ID" | jq -r '.description'

# 2. Anonymous PATCH -> expect HTTP 401 and {"error":"Unauthorized"}
curl -s -o /dev/stderr -w '%{http_code}\n' \
  -X PATCH "$BASE_URL/api/restaurant-dashboard/$RESTAURANT_ID" \
  -H 'Content-Type: application/json' \
  -d '{"description":"smoke-test-should-not-persist"}'

# 3. Anonymous GET -> expect HTTP 401
curl -s -o /dev/null -w '%{http_code}\n' \
  "$BASE_URL/api/restaurant-dashboard/$RESTAURANT_ID"

# 4. Confirm the description from step 1 is unchanged
curl -s "$BASE_URL/api/restaurants/$RESTAURANT_ID" | jq -r '.description'
```

The owner path is verified by signing in as a user with a verified
`RestaurantOwner` row (or an `ADMIN`/`EDITOR` account), loading
`/restaurant-dashboard`, and saving a profile edit; the same `PATCH` then
returns `200`.
