# Contact form — diagnosis (live site, before the fix)

Live site: https://gouranglokwani.in (commit `a6f456e`). Tested with Playwright + Chrome 155,
1440×900, on 2026-10-28.

## 1. A real submission on the live site

Form filled with: name `TEST - diagnosis`, email gouranglokwani27@gmail.com, phone
`+91 98765 43210`, message "Diagnosis run for the contact form. Please ignore."

| Time | Request | Result |
| --- | --- | --- |
| +0.1 s | `POST https://formsubmit.co/ajax/gouranglokwani27@gmail.com` | no answer within 12 s; aborted by the timeout (`net::ERR_ABORTED`) |
| +13.6 s | same request (automatic retry) | no answer within 12 s; aborted again |
| — | Web3Forms backup | **never sent**: no key in the build |

Message shown to the visitor after **25.6 s**: *"Couldn't send — the mail service took too long to
answer. Your message is still here."* **Nothing was delivered.**

## 2. FormSubmit outside the browser

The same request from a server (curl, 40 s cap) was answered after **16.9 s**:

```json
{"success":"false","message":"This form needs Activation. We've sent you an email containing an 'Activate Form' link. Just click it and your form will be actived!"}
```

So FormSubmit is both **not activated** and **slower than the form's 12 s timeout**. The visitor
therefore saw "took too long" instead of the activation message.

## 3. Web3Forms key in the deployed bundle

The deployed JavaScript (entry plus every chunk it references) contains the Web3Forms URL in code,
but **no key-shaped string** (0 UUID-like values). `VITE_WEB3FORMS_KEY` is **absent**, and the
Vercel project had no environment variables at all.

## Verdict

| Suspected cause | Real? |
| --- | --- |
| FormSubmit's activation never done (and/or needed again for the new domain) | **Yes**: "This form needs Activation" |
| `VITE_WEB3FORMS_KEY` missing, so the backup never runs | **Yes**: absent from the bundle, no Vercel env vars |
| Browser-side sending blocked by ad blockers / privacy tools / networks | Not observed in this plain-Chrome test, but a standing risk for real visitors, and the reason the fix moves sending to the server |

**Every submission was failing:** after ~25 s the visitor saw an error, and the message never reached
the inbox.

## Fix (see `api/contact.ts`, `server/contact.ts`)

- **Same-origin endpoint:** the form now posts to our own `/api/contact`, so ad blockers and
  privacy tools that block third-party form services can't stop it.
- **Server-side checks:** the server validates the enquiry, applies the spam guards (honeypot,
  per-IP rate limit, 10 kB body limit), and emails it through **Resend**, with Web3Forms as a
  server-side backup.
- **No keys in the browser:** both keys stay server-side.
- **FormSubmit removed:** it isn't activated.
