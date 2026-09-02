type AvatarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/** Illustrated avatar when no profile photo is uploaded. */
export function userAvatarUrl(user: AvatarUser, size = 128) {
  if (user.image?.trim()) return user.image.trim();
  const seed = encodeURIComponent(user.email ?? user.name ?? "epl-user");
  return `https://api.dicebear.com/9.x/lorelei/png?seed=${seed}&size=${size}`;
}
