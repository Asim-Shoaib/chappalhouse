# Returns & Exchanges Policy — DRAFT for review

Status: draft. Not published. Abdullah to approve wording and the exchange window
before this goes on the site.

---

## The commercial reasoning (internal — not for the website)

Pakistan's national RTO rate runs 18–20%: roughly one in five COD parcels comes
back. At Chappal House's margins a returned chappal wipes out the profit from two
delivered ones, so the policy has to do two jobs at once:

1. **Reduce refused-on-arrival parcels**, which cost us money and earn nothing.
2. **Not scare off genuine buyers**, who need reassurance before paying a brand
   they have never heard of.

Those pull in opposite directions. The resolution used below: be generous about
*size* problems, which are our fault and are fixable with an exchange, and firm
about *change of mind*, which is not our fault and cannot be resold at full value.

Exchange over refund wherever possible. An exchange keeps the cash and costs us
only shipping; a refund loses the sale entirely.

---

## Published policy (draft wording for the site)

### Exchanges

We accept exchanges within **7 days of delivery** if:

- The item is unworn, with the sole clean and unmarked
- Original packaging is intact
- You contact us on WhatsApp before sending anything back

Exchanges are for **size only** — the same design in a different size, subject to
availability. If your size is unavailable we will offer store credit valid for
90 days.

**Who pays:** the customer pays return shipping. We pay to send the replacement.

### Returns for refund

We accept refunds only where the item is:

- **Damaged or defective on arrival**, or
- **Not the item you ordered**

In both cases we pay shipping both ways and refund in full.

Report within **48 hours of delivery** with photos, over WhatsApp.

### What we cannot accept

- Change of mind after delivery
- Items that have been worn outdoors
- Items returned after 7 days
- Items without original packaging

Handcrafted khussa and chappals vary slightly in colour, embroidery, and finish
between pairs. That is a property of handmade footwear, not a defect.

### Refused deliveries

If a parcel is refused at the door or the number is unreachable at delivery, we
may ask for advance payment on future orders from that number.

### How to start a return or exchange

WhatsApp us at [number] with your order number and a photo. We reply within
24 hours.

---

## Operational rules (internal)

**Sizing is the main driver of returns.** Batch 1 stock runs 36–41 but real
depth sits in 37–40 — only 6 pairs across all SKUs in size 36 and 2 in size 41.
Never list a size with fewer than 2 pairs as freely available; oversell there
turns into a cancellation, which reads to the customer exactly like a return.

**Publish a size guide before launch.** Pakistani sizing is inconsistent between
manufacturers. A foot-length-in-centimetres chart cuts size returns more than
any policy wording does.

**The confirmation call is the policy that matters.** Every COD order gets a
WhatsApp or phone confirmation before dispatch. Documented effect of order
verification in this market is a ~40% drop in fake orders. Cheaper than any
return process.

**Returned stock goes back into inventory** via a `return_to_stock` movement,
not by editing `stock_qty`. Damaged returns get a `damaged` movement so the loss
is visible in the ledger rather than silently absorbed.

**Track the reason on every return.** `orders.return_reason` is free reorder
intelligence: if "too small" dominates for one design, that design runs small
and the listing needs a note.

---

## Open questions for Abdullah

1. **7 days or 3 days for exchanges?** 7 is customer-friendly and standard for
   Pakistani fashion e-commerce. 3 reduces exposure but reads as stingy.
2. **Store credit or refund** when the exchange size is unavailable? Credit
   keeps the cash; refund is friendlier.
3. **Who is named as the contact?** The WhatsApp seller, or a shared business
   number? Affects the wording above.
4. **Do we offer free first exchange** as a launch trust-builder? It costs
   roughly one shipping leg per exchange but removes the biggest hesitation for
   a first-time buyer of an unknown brand.
