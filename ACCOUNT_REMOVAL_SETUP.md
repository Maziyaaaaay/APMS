# Permanently remove an APMS account

This change replaces the old **disable-only** action with permanent removal. Faculty advisors can remove students in their own department; the super admin can remove students, faculty, and sub-admins. It is intended for test accounts and account-removal requests.

## What removal does

- **Student:** permanently deletes the user row, all certificate submissions and points associated with that student, and the corresponding private certificate files. Their KTU registration number is freed for a new signup.
- **Faculty or sub-admin:** permanently deletes the user row and their account/review history. Student certificate records and their current decision/points remain; a removed faculty member is detached from the reviewer field. Circulars created by the removed account are deleted.
- **Super admin:** cannot be removed. Transfer super-admin ownership first if that account must be replaced.

Faculty advisors can remove only students in their own department. The super admin can remove students, faculty, and sub-admins.

Permanent removal cannot be undone. Export any records that must be retained before removing an account.

## Apply the database migration

The API needs migration 005 before the new remove action can run.

1. Sign in to Supabase and open the APMS production project (`xikqrthyuuqhptunigde`).
2. Open **SQL Editor** and create a new query.
3. Open `server/db/migrations/005_superadmin_permanent_user_removal.sql` in this repository and copy the complete file.
4. Paste it into the new SQL query and click **Run**.
5. Confirm Supabase reports success. If it reports an error, stop and keep the full error message; do not rerun a partial script or run a rebuild script.

## Deploy the matching APMS code

Deploy the application version that includes the permanent-removal route and admin UI. The server will return a clear setup error until the migration is applied.

## Remove the previously disabled test account

1. Sign in as the super admin and open **Admin → Manage Users → Students** (or sign in as the student's faculty advisor and open **My Students**).
2. Find the old test account. It may still appear because the previous action only disabled it.
3. Click its trash/remove button and read the confirmation carefully. Removing a student also removes their submissions, points, and uploaded certificate files.
4. After removal succeeds, retry signup with the test registration number. It should now be available.

The super admin sees controls to remove students, faculty, and sub-admins. Faculty can remove students only in their own department. Other non-super-admin users cannot remove accounts.
