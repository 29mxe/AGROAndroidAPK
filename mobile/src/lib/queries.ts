import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api/api";
import { getDemoPostDetail, isLocalDemoId } from "./field-meta";
import type {
  AppNotification,
  CreatePostBody,
  FeedPost,
  PostComment,
  PostDetail,
  UpdateProfileBody,
  UserProfile,
} from "./types";

// ---------- Posts ----------

export const useFeed = (authorId?: string) =>
  useQuery({
    queryKey: ["posts", authorId ?? "all"],
    queryFn: () =>
      api.get<FeedPost[]>(`/api/posts${authorId ? `?authorId=${encodeURIComponent(authorId)}` : ""}`),
  });

export const usePost = (id: string) =>
  useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      // Locally generated demo observations are never requested from the backend
      if (isLocalDemoId(id)) {
        const demo = getDemoPostDetail(id);
        if (!demo) throw new Error("Пример не найден");
        return demo;
      }
      return api.get<PostDetail>(`/api/posts/${id}`);
    },
    enabled: !!id,
  });

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePostBody) => api.post<FeedPost>("/api/posts", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
};

const patchPostInCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: (p: FeedPost) => FeedPost
) => {
  queryClient.setQueriesData<FeedPost[]>({ queryKey: ["posts"] }, (old) =>
    old ? old.map((p) => (p.id === postId ? patch(p) : p)) : old
  );
  queryClient.setQueryData<PostDetail>(["post", postId], (old) =>
    old ? ({ ...old, ...patch(old) } as PostDetail) : old
  );
};

export const useToggleLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      api.post<{ liked: boolean; likeCount: number }>(`/api/posts/${postId}/like`),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["post", postId] });
      patchPostInCaches(queryClient, postId, (p) => ({
        ...p,
        likedByMe: !p.likedByMe,
        likeCount: p.likedByMe ? Math.max(0, p.likeCount - 1) : p.likeCount + 1,
      }));
    },
    onSuccess: (data, postId) => {
      patchPostInCaches(queryClient, postId, (p) => ({
        ...p,
        likedByMe: data.liked,
        likeCount: data.likeCount,
      }));
    },
    onError: (_e, postId) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) =>
      api.post<PostComment>(`/api/posts/${postId}/comments`, { text }),
    onSuccess: (comment, { postId }) => {
      queryClient.setQueryData<PostDetail>(["post", postId], (old) =>
        old
          ? { ...old, commentCount: old.commentCount + 1, comments: [...old.comments, comment] }
          : old
      );
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
};

// ---------- Profile ----------

export const useMyProfile = (enabled: boolean) =>
  useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => api.get<UserProfile>("/api/users/me"),
    enabled,
  });

export const useUserProfile = (id: string) =>
  useQuery({
    queryKey: ["profile", id],
    queryFn: () => api.get<UserProfile>(`/api/users/${id}`),
    enabled: !!id,
  });

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => api.patch<UserProfile>("/api/users/me", body),
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile", "me"], profile);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
};

// ---------- Notifications ----------

export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => api.get<AppNotification[]>("/api/notifications"),
  });

export const useUnreadCount = (enabled: boolean) =>
  useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api.get<{ count: number }>("/api/notifications/unread-count"),
    enabled,
    refetchInterval: 15000, // in-app "push": poll for new likes/comments
  });

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ success: boolean }>("/api/notifications/read"),
    onSuccess: () => {
      queryClient.setQueryData(["notifications", "unread"], { count: 0 });
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
    },
  });
};
