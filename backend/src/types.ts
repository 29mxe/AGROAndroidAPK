// API contract shared between backend and mobile.
// Mobile mirrors these shapes in mobile/src/lib/types.ts (cannot import across projects).

export type Specialization = "FARMER" | "AGRONOMIST";

export interface UserProfile {
  id: string;
  name: string;
  email?: string; // only present on own profile
  image: string | null;
  specialization: Specialization | null;
  experienceYears: number | null;
  city: string | null;
  bio: string | null;
  createdAt: string;
  postCount: number;
}

export interface PostAuthor {
  id: string;
  name: string;
  image: string | null;
  specialization: Specialization | null;
  city: string | null;
}

export interface FeedPost {
  id: string;
  text: string;
  imageUrl: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  createdAt: string;
  author: PostAuthor;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface PostComment {
  id: string;
  text: string;
  createdAt: string;
  author: PostAuthor;
}

export interface PostDetail extends FeedPost {
  comments: PostComment[];
}

export interface AppNotification {
  id: string;
  type: "LIKE" | "COMMENT";
  read: boolean;
  createdAt: string;
  actor: PostAuthor;
  post: {
    id: string;
    text: string;
    imageUrl: string | null;
  };
  commentText: string | null;
}

// Request bodies
export interface CreatePostBody {
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export interface UpdateProfileBody {
  name?: string;
  image?: string;
  specialization?: Specialization;
  experienceYears?: number;
  city?: string;
  bio?: string;
}
