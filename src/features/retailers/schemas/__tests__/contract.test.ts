import { describe, it, expect } from 'vitest';
import {
  retailerListSchema,
  retailerDetailSchema,
  retailerCreatedSchema,
} from '../retailerSchema';

/**
 * The shapes the Go backend actually emits — not the shapes we wish it did.
 *
 * # Why every fixture here is a raw JSON string
 *
 * The existing retailer tests build fixtures as TypeScript object literals, so
 * the compiler types them against the very schema they are supposed to be
 * testing. A literal cannot express `"bankDetails": null` where the schema says
 * "array", because that would not compile — which is precisely why 803 passing
 * tests did not notice the list endpoint returning exactly that.
 *
 * `JSON.parse` produces `any`. The compiler stops helping, the schema has to do
 * the work, and the test can express shapes that are wrong.
 *
 * # The shapes, and where they come from
 *
 * Go marshals a nil slice to `null`. `RetailerProfile` is shared by
 * ListRetailers and GetRetailerByID; the list never populates bankDetails,
 * mobileWallets or documents, so all three arrive as `null` — and
 * `platform/httpx.emptyListsNotNull` does not rescue them, because it descends
 * into `map[string]any` and top-level slices only, never into struct fields
 * inside a slice of structs.
 *
 * Both `null` and absent must parse. Which one arrives depends on a Go struct
 * tag, and the client should not break either way.
 */

const LIST_ROW_WITH_NULLS = `{
  "data": [
    {
      "id": "d25bb30f-ddac-4d57-94d9-8e6dc194cee7",
      "name": "Karim Uddin",
      "shopName": "Karim Traders",
      "phone": "01712345678",
      "creditScore": 0,
      "status": "active",
      "createdAt": "2026-08-05T10:00:00Z",
      "district": "Dhaka",
      "category": "Gents textile",
      "createdBy": "ADMIN",
      "createdByName": "Rumman Hossain",
      "bankDetails": null,
      "mobileWallets": null,
      "documents": null
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}`;

const LIST_ROW_WITHOUT_THE_KEYS = `{
  "data": [
    {
      "id": "d25bb30f-ddac-4d57-94d9-8e6dc194cee7",
      "name": "Karim Uddin",
      "shopName": "Karim Traders",
      "phone": "01712345678",
      "creditScore": 0,
      "status": "active",
      "createdAt": "2026-08-05T10:00:00Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}`;

const DETAIL_POPULATED = `{
  "data": {
    "id": "d25bb30f-ddac-4d57-94d9-8e6dc194cee7",
    "name": "Karim Uddin",
    "shopName": "Karim Traders",
    "phone": "01712345678",
    "creditScore": 0,
    "status": "active",
    "createdAt": "2026-08-05T10:00:00Z",
    "bankDetails": [
      {
        "id": "b1",
        "bankName": "BRAC Bank",
        "accountName": "Karim Uddin",
        "accountNumber": "1501234567890",
        "branch": "Gulshan",
        "isDefault": true
      }
    ],
    "mobileWallets": [
      { "id": "w1", "walletType": "bkash", "accountNumber": "01712345678", "isDefault": true }
    ],
    "documents": [
      { "id": "doc1", "docType": "nid", "docName": "NID copy", "hasFile": true, "status": "pending" }
    ]
  }
}`;

const DETAIL_EMPTY_LISTS = `{
  "data": {
    "id": "d25bb30f-ddac-4d57-94d9-8e6dc194cee7",
    "name": "Karim Uddin",
    "shopName": "Karim Traders",
    "phone": "01712345678",
    "creditScore": 0,
    "status": "active",
    "createdAt": "2026-08-05T10:00:00Z",
    "bankDetails": [],
    "mobileWallets": [],
    "documents": []
  }
}`;

describe('retailer list contract', () => {
  it('parses a row whose collections are null', () => {
    // THE REGRESSION. `z.array(...).default([])` fires only on `undefined`, so
    // a `null` was rejected — and one rejected row fails the whole response,
    // which is why the screen said "The retailer directory did not respond".
    const parsed = retailerListSchema.safeParse(JSON.parse(LIST_ROW_WITH_NULLS));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    // Null becomes an empty list, so the console renders "None on file" rather
    // than crashing on `.length` of null.
    const row = parsed.data.data[0];
    expect(row.bankDetails).toEqual([]);
    expect(row.mobileWallets).toEqual([]);
    expect(row.documents).toEqual([]);
  });

  it('parses a row where the collections are absent entirely', () => {
    // The post-`omitempty` shape. Covered alongside the null case on purpose:
    // which one arrives is decided by a Go struct tag, and flipping that tag
    // must not be able to take the screen down.
    const parsed = retailerListSchema.safeParse(JSON.parse(LIST_ROW_WITHOUT_THE_KEYS));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.data[0].bankDetails).toEqual([]);
  });

  it('keeps the row data around the collections intact', () => {
    const parsed = retailerListSchema.parse(JSON.parse(LIST_ROW_WITH_NULLS));
    const row = parsed.data[0];
    // The columns the list actually renders — proving the tolerance added for
    // the collections did not quietly loosen anything else.
    expect(row.shopName).toBe('Karim Traders');
    expect(row.district).toBe('Dhaka');
    expect(row.createdByName).toBe('Rumman Hossain');
    expect(parsed.meta.total).toBe(1);
  });
});

describe('retailer detail contract', () => {
  it('parses populated collections without altering them', () => {
    const parsed = retailerDetailSchema.safeParse(JSON.parse(DETAIL_POPULATED));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const r = parsed.data.data;
    expect(r.bankDetails).toHaveLength(1);
    expect(r.bankDetails[0].bankName).toBe('BRAC Bank');
    expect(r.bankDetails[0].isDefault).toBe(true);
    expect(r.mobileWallets[0].walletType).toBe('bkash');
    // hasFile is a boolean and never a URL — the object path stays server-side.
    expect(r.documents[0].hasFile).toBe(true);
  });

  it('parses a shop with nothing on file', () => {
    const parsed = retailerDetailSchema.safeParse(JSON.parse(DETAIL_EMPTY_LISTS));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.data.bankDetails).toEqual([]);
  });

  it('parses a detail response with the collections null', () => {
    // Every retailer today, since nothing populates those tables yet. The
    // detail screen was broken for all of them, not only the list.
    const withNulls = JSON.parse(DETAIL_EMPTY_LISTS);
    withNulls.data.bankDetails = null;
    withNulls.data.mobileWallets = null;
    withNulls.data.documents = null;

    const parsed = retailerDetailSchema.safeParse(withNulls);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.data.bankDetails).toEqual([]);
  });
});

/**
 * POST /auth/admin/create-retailer returns a SessionUser — a DIFFERENT shape
 * from GET /admin/retailers/{id}, because it lives in a different Go package.
 */
const CREATE_RESPONSE = `{
  "data": {
    "id": "d25bb30f-ddac-4d57-94d9-8e6dc194cee7",
    "name": "Karim Uddin",
    "email": "",
    "role": "retailer",
    "shopName": "Karim Traders",
    "phone": "01712345678",
    "marginPercent": 0,
    "retailerId": "d25bb30f-ddac-4d57-94d9-8e6dc194cee7",
    "userType": "retailer",
    "emailVerified": false,
    "storeCreated": false,
    "storeSetupCompleted": true,
    "status": "active",
    "createdBy": "ADMIN"
  }
}`;

describe('retailer create contract', () => {
  it('parses the SessionUser the create endpoint really returns', () => {
    const parsed = retailerCreatedSchema.safeParse(JSON.parse(CREATE_RESPONSE));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.data.id).toBe('d25bb30f-ddac-4d57-94d9-8e6dc194cee7');
  });

  it('would NOT parse as a retailer profile — which is the bug this replaced', () => {
    // Pinned deliberately. The create response was parsed with
    // retailerDetailSchema, so a successful 201 threw and the operator was told
    // the retailer could not be created — after it had been. If someone points
    // create back at the detail schema, this test says why that fails.
    const asProfile = retailerDetailSchema.safeParse(JSON.parse(CREATE_RESPONSE));

    expect(asProfile.success).toBe(false);
    if (asProfile.success) return;
    const missing = asProfile.error.issues.map((i) => i.path.join('.'));
    expect(missing).toContain('data.creditScore');
    expect(missing).toContain('data.createdAt');
  });

  it('refuses a response with no id, rather than navigating nowhere', () => {
    // An id is the one thing the caller needs. Accepting a blank would send the
    // operator to /retailers/ and a blank screen, which reads as "it worked".
    expect(retailerCreatedSchema.safeParse({ data: { id: '' } }).success).toBe(false);
    expect(retailerCreatedSchema.safeParse({ data: {} }).success).toBe(false);
  });
});

describe('retailer update contract', () => {
  it('the PATCH response is a string, not a retailer', () => {
    // `{"data":"updated"}` is what internal/admin/handler.go actually writes.
    // Pinned so nobody re-adds `retailerDetailSchema.parse` to updateRetailer:
    // it threw on every successful save, and the operator was told the change
    // failed after it had landed.
    const parsed = retailerDetailSchema.safeParse(JSON.parse('{"data":"updated"}'));
    expect(parsed.success).toBe(false);
  });
});

describe('a malformed detail response names its field', () => {
  it('reports the exact path that failed', () => {
    // The diagnosis this feature needed four times over. A generic "could not
    // be loaded" sent me reading schemas; the path sends me to the field.
    const missingCreditScore = JSON.parse(DETAIL_EMPTY_LISTS);
    delete missingCreditScore.data.creditScore;

    const parsed = retailerDetailSchema.safeParse(missingCreditScore);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const paths = parsed.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('data.creditScore');
  });

  it('reports a nested path, not just the collection', () => {
    // A bad row inside documents must name the ROW, or the operator is told
    // "documents" and left to guess which of five.
    const badDoc = JSON.parse(DETAIL_POPULATED);
    delete badDoc.data.documents[0].id;

    const parsed = retailerDetailSchema.safeParse(badDoc);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues.map((i) => i.path.join('.'))).toContain('data.documents.0.id');
  });
});
