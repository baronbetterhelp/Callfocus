# CallFocus V15.34 Visual Test — Mobile Payments Width Lock

Built directly on **V15.33 Visual Test**.

## Fix

- Fixes the Admin → Payments tab widening the iPhone viewport and allowing horizontal left/right page movement.
- Locks the Payments tab, manual-payment panel, cards and data grid to the available viewport width.
- Long customer emails, phone/date text, payment references and receipt filenames now wrap safely instead of contributing intrinsic page width.
- Mobile manual-payment cards and action buttons are constrained to their parent width.
- The sticky global save dock now remains aligned to the normal admin viewport because the Payments content no longer expands the document.
- Other admin tabs and customer-site behavior are unchanged.

Build: `15.35-test`
