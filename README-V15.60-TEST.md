# CallFocus V15.60 Visual Test — Natural Call Plan Rebuild

## What changed

- Added an optional **Rebuild** control directly under **What today’s call is about** for both completely new calls and repeat calls.
- The control is labeled **Recommended** and explains that it is recommended for the best call experience.
- Rebuild sends the customer’s rough call notes plus the existing caller context, conversation dynamics, call language, opening choice and repeat-call context to a new authenticated `/api/call-plan/rebuild` endpoint.
- GPT-6 Luna returns a flexible **Natural call plan** that replaces the rough notes in the same field, remaining fully editable before the call starts.
- The planner detects whether the call is relationship/personal, friendship, family, business/professional, sales, support, sensitive or general and builds the pacing appropriately.
- Relationship/personal calls establish human connection before heavier details; business/professional calls stay concise without becoming abrupt; sensitive calls use gentler transitions.
- Rebuilt plans explicitly keep the voice from dumping the agenda, asking several questions at once or rushing through prepared points.
- The live-call instructions were strengthened for **all** calls so CallFocus uses one meaningful thought/question at a time and waits for the other person rather than racing through the call purpose.
- Rebuild is optional. Customers can still type their own call details and start immediately without using it.
- The endpoint uses the existing OpenAI key, `store:false`, authenticated customer sessions and a rate limit of 60 rebuilds per hour per limiter scope.

## Unchanged

Calls, credits, referrals, payments, signup/email verification, caller auto-fill, editable custom voices, promotional email studio, themes and Admin behavior remain unchanged.

## Build

`15.60-test`
