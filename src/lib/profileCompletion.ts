import type { AuthUser } from "../types";

/**
 * Single source of truth for "is this profile complete".
 *
 * This used to be duplicated as an inline boolean inside
 * ProfileCompletionBanner while ProfilePage had no notion of it at all —
 * which is what produced the long-running "banner never goes away" bug. The
 * save path treated every field as optional and reported plain success for a
 * partial save, so a user who left (say) email blank got "Profil saqlandi!",
 * got redirected away, and reasonably concluded the profile was fully saved
 * — while the banner, correctly, kept showing. Nothing was broken in
 * persistence; the two halves simply disagreed about what "complete" meant.
 *
 * Both halves now import from here, so they cannot drift apart again.
 */
export type ProfileField = "age" | "gender" | "districtId";

/**
 * Order matters — this is the order missing fields are listed to the user.
 *
 * email and avatarId are deliberately NOT here: they're optional extras, not
 * completion criteria. Requiring email meant a user who filled everything
 * they considered "their profile" still got nagged by the banner.
 */
export const REQUIRED_PROFILE_FIELDS: ProfileField[] = ["age", "gender", "districtId"];

/** i18n key carrying each field's user-facing label. */
export const PROFILE_FIELD_LABEL_KEY: Record<ProfileField, "age" | "gender" | "city"> = {
  age: "age",
  gender: "gender",
  districtId: "city",
};

type ProfileShape = Partial<Pick<AuthUser, ProfileField>> | null | undefined;

export function missingProfileFields(user: ProfileShape): ProfileField[] {
  if (!user) return [];
  // Deliberately a truthiness check per field rather than `!= null`: an empty
  // string email and a 0 age are both "not filled in" as far as the user is
  // concerned, and the API stores blank input as null anyway.
  return REQUIRED_PROFILE_FIELDS.filter((field) => !user[field]);
}

export function isProfileComplete(user: ProfileShape): boolean {
  return !!user && missingProfileFields(user).length === 0;
}
