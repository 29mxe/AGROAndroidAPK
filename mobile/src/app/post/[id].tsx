import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { ArrowLeft, MessageCircle, SendHorizontal, Trash2 } from "lucide-react-native";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { SimilarCases } from "@/components/SimilarCases";
import { EmptyState } from "@/components/EmptyState";
import { useAddComment, useDeletePost, useMyProfile, usePost } from "@/lib/queries";
import { useSession } from "@/lib/auth/use-session";
import { colors } from "@/lib/theme";
import type { PostComment } from "@/lib/types";
import { lightTap, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/cn";
import { adviceWord, isLocalDemoId } from "@/lib/field-meta";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: post, isLoading } = usePost(id ?? "");
  const { data: session } = useSession();
  const { data: me } = useMyProfile(!!session?.user);
  const addComment = useAddComment();
  const deletePost = useDeletePost();

  const [comment, setComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDemo = !!id && isLocalDemoId(id);
  const isMyPost = !!post && !!me && post.author.id === me.id && !isDemo;

  const submitComment = () => {
    const trimmed = comment.trim();
    if (!trimmed || !id) return;
    lightTap();
    addComment.mutate(
      { postId: id, text: trimmed },
      { onSuccess: () => setComment("") }
    );
  };

  const onDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (!id) return;
    deletePost.mutate(id, { onSuccess: () => router.back() });
  };

  return (
    <SafeAreaView className="flex-1 bg-field" edges={["top", "bottom"]} testID="post-detail-screen">
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
          <Pressable
            testID="post-back-button"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-wheat bg-parchment active:opacity-70"
          >
            <ArrowLeft size={19} color={colors.bark} />
          </Pressable>
          <Text className="font-gsemibold text-lg text-bark">Наблюдение</Text>
          {isMyPost ? (
            <Pressable
              testID="delete-post-button"
              onPress={onDelete}
              disabled={deletePost.isPending}
              className={cn(
                "h-10 flex-row items-center justify-center gap-1.5 rounded-full px-3 active:opacity-70",
                confirmDelete ? "bg-clay" : "border border-wheat bg-parchment"
              )}
            >
              {deletePost.isPending ? (
                <ActivityIndicator size="small" color={colors.parchment} />
              ) : (
                <>
                  <Trash2 size={16} color={confirmDelete ? colors.parchment : colors.clay} />
                  {confirmDelete ? (
                    <Text className="font-gsemibold text-xs text-parchment">Удалить?</Text>
                  ) : null}
                </>
              )}
            </Pressable>
          ) : (
            <View className="h-10 w-10" />
          )}
        </View>

        {isLoading || !post ? (
          <View className="flex-1 items-center justify-center" testID="post-loading">
            <ActivityIndicator size="large" color={colors.forest} />
          </View>
        ) : (
          <FlatList
            testID="comments-list"
            data={post.comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CommentRow comment={item} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View className="mb-4 gap-4">
                <PostCard post={post} isDetail />
                <SimilarCases post={post} />
                <Text className="mt-1 px-1 font-gsemibold text-bark" style={{ fontSize: 16 }}>
                  {post.commentCount > 0
                    ? `${post.commentCount} ${adviceWord(post.commentCount)}`
                    : "Советы"}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                icon={MessageCircle}
                title="Советов пока нет"
                subtitle="Поделитесь опытом — напишите первым"
                testID="comments-empty"
              />
            }
          />
        )}

        {/* Comment ("advice") input — demo observations are read-only */}
        {isDemo ? (
          <View className="border-t border-wheat bg-parchment px-4 py-3" testID="demo-comment-notice">
            <Text className="text-center text-sm text-stone">
              Это пример наблюдения. Советы можно оставлять к реальным публикациям.
            </Text>
          </View>
        ) : (
        <View className="flex-row items-end gap-2.5 border-t border-wheat bg-parchment px-4 pb-2 pt-2.5">
          <TextInput
            testID="comment-input"
            value={comment}
            onChangeText={setComment}
            placeholder="Написать совет…"
            placeholderTextColor={colors.stone}
            multiline
            className="max-h-[100px] flex-1 rounded-2xl bg-field px-4 py-3 text-base text-bark"
            style={{ fontFamily: "GolosText_400Regular" }}
          />
          <Pressable
            testID="send-comment-button"
            onPress={submitComment}
            disabled={addComment.isPending || !comment.trim()}
            className={cn(
              "h-11 w-11 items-center justify-center rounded-full bg-forest active:opacity-90",
              (addComment.isPending || !comment.trim()) && "opacity-50"
            )}
          >
            {addComment.isPending ? (
              <ActivityIndicator size="small" color={colors.parchment} />
            ) : (
              <SendHorizontal size={18} color={colors.parchment} />
            )}
          </Pressable>
        </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CommentRow({ comment }: { comment: PostComment }) {
  return (
    <View className="flex-row gap-2.5" testID={`comment-${comment.id}`}>
      <Pressable
        onPress={() => router.push(`/user/${comment.author.id}`)}
        disabled={isLocalDemoId(comment.author.id)}
      >
        <Avatar name={comment.author.name} uri={comment.author.image} size={36} />
      </Pressable>
      <View className="flex-1 rounded-2xl rounded-tl-md border border-wheat bg-parchment px-3.5 py-2.5">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-gsemibold text-sm text-bark" numberOfLines={1}>
            {comment.author.name}
          </Text>
          <Text className="text-xs text-stone">{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text className="mt-1 text-sm leading-5 text-bark">{comment.text}</Text>
      </View>
    </View>
  );
}
