import React, { useState, useEffect } from 'react';

// 포스트 및 작성자 타입 정의
interface Author {
  name: string;
  email?: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: Author;
  likes?: number;
}

// 모의 GraphQL 클라이언트 인터페이스
interface GraphQLClient {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<{ data: T, errors?: unknown[] }>;
  mutate<T>(mutation: string, variables?: Record<string, unknown>): Promise<{ data: T, errors?: unknown[] }>;
}

// 모의 GraphQL 클라이언트 구현
const mockGraphQLClient: GraphQLClient = {
  query: async function<T>(query: string, variables?: Record<string, unknown>): Promise<{ data: T, errors?: unknown[] }> {
    console.log('GraphQL 쿼리 실행:', query, variables);
    
    // 포스트 목록 쿼리 처리
    if (query.includes('getPosts')) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 네트워크 지연 시뮬레이션
      return {
        data: {
          posts: [
            { id: '1', title: 'GraphQL 소개', content: 'GraphQL은 API를 위한 쿼리 언어입니다.', author: { name: '홍길동' } },
            { id: '2', title: 'Apollo 클라이언트', content: 'Apollo는 GraphQL 클라이언트 라이브러리입니다.', author: { name: '김철수' } },
            { id: '3', title: 'React와 GraphQL', content: 'React와 GraphQL을 함께 사용하는 방법', author: { name: '이영희' } },
          ]
        } as unknown as T
      };
    }
    
    // 포스트 상세 정보 쿼리 처리
    if (query.includes('getPost')) {
      await new Promise(resolve => setTimeout(resolve, 300)); // 네트워크 지연 시뮬레이션
      const postId = variables?.id;
      const posts = [
        { id: '1', title: 'GraphQL 소개', content: 'GraphQL은 API를 위한 쿼리 언어입니다.', author: { name: '홍길동', email: 'hong@example.com' } },
        { id: '2', title: 'Apollo 클라이언트', content: 'Apollo는 GraphQL 클라이언트 라이브러리입니다.', author: { name: '김철수', email: 'kim@example.com' } },
        { id: '3', title: 'React와 GraphQL', content: 'React와 GraphQL을 함께 사용하는 방법', author: { name: '이영희', email: 'lee@example.com' } },
      ];
      
      const post = posts.find(p => p.id === postId);
      if (post) {
        return { data: { post } as unknown as T };
      } else {
        return { data: {} as T, errors: [{ message: '포스트를 찾을 수 없습니다.' }] };
      }
    }
    
    return { data: {} as T, errors: [{ message: '지원되지 않는 쿼리입니다.' }] };
  },
  
  mutate: async function<T>(mutation: string, variables?: Record<string, unknown>): Promise<{ data: T, errors?: unknown[] }> {
    console.log('GraphQL 뮤테이션 실행:', mutation, variables);
    
    // 좋아요 뮤테이션 처리
    if (mutation.includes('likePost')) {
      await new Promise(resolve => setTimeout(resolve, 300)); // 네트워크 지연 시뮬레이션
      return {
        data: {
          likePost: {
            id: variables?.id,
            likes: Math.floor(Math.random() * 100) + 1 // 랜덤 좋아요 수 반환
          }
        } as unknown as T
      };
    }
    
    // 댓글 추가 뮤테이션 처리
    if (mutation.includes('addComment')) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 네트워크 지연 시뮬레이션
      return {
        data: {
          addComment: {
            id: `comment-${Date.now()}`,
            postId: variables?.postId,
            text: variables?.text,
            author: 'current-user'
          }
        } as unknown as T
      };
    }
    
    return { data: {} as T, errors: [{ message: '지원되지 않는 뮤테이션입니다.' }] };
  }
};

// GraphQL 컨텍스트
interface GraphQLContextValue {
  client: GraphQLClient;
  loading: boolean;
}

const GraphQLContext = React.createContext<GraphQLContextValue>({
  client: mockGraphQLClient,
  loading: false
});

// GraphQL 훅
function useGraphQL() {
  return React.useContext(GraphQLContext);
}

// 포스트 목록 컴포넌트
function PostList() {
  const { client } = useGraphQL();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const query = `
          query getPosts {
            posts {
              id
              title
              content
              author {
                name
              }
            }
          }
        `;
        
        setLoading(true);
        const result = await client.query<{ posts: Post[] }>(query);
        
        if (result.errors) {
          // 타입 안전하게 message 속성에 접근
          const errorMsg = result.errors[0] ? 
            (typeof result.errors[0] === 'object' && result.errors[0] !== null && 'message' in result.errors[0]) ? 
            String(result.errors[0].message) : 
            '포스트를 불러오는 중 오류가 발생했습니다.' : 
            '포스트를 불러오는 중 오류가 발생했습니다.';
          setError(errorMsg);
        } else {
          setPosts(result.data.posts);
          setError(null);
        }
      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message || '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, [client]);
  
  if (loading) return <div className="text-center py-4">포스트를 불러오는 중...</div>;
  if (error) return <div className="text-red-500 py-4">오류: {error}</div>;
  
  return (
    <div className="post-list">
      <h2 className="text-xl font-bold mb-4">포스트 목록</h2>
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

// 포스트 카드 컴포넌트
function PostCard({ post }: { post: Post }) {
  const { client } = useGraphQL();
  const [likes, setLikes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [postDetail, setPostDetail] = useState<Post | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const handleLike = async () => {
    try {
      setLoading(true);
      const mutation = `
        mutation likePost($id: ID!) {
          likePost(id: $id) {
            id
            likes
          }
        }
      `;
      
      const result = await client.mutate<{ likePost: { id: string, likes: number } }>(
        mutation,
        { id: post.id }
      );
      
      if (result.data?.likePost) {
        setLikes(result.data.likePost.likes);
      }
    } catch (err) {
      console.error('좋아요 처리 중 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewDetail = async () => {
    if (selectedPost === post.id) {
      // 이미 선택된 포스트를 다시 클릭하면 닫기
      setSelectedPost(null);
      setPostDetail(null);
      return;
    }
    
    try {
      setDetailLoading(true);
      setSelectedPost(post.id);
      
      const query = `
        query getPost($id: ID!) {
          post(id: $id) {
            id
            title
            content
            author {
              name
              email
            }
          }
        }
      `;
      
      const result = await client.query<{ post: Post }>(query, { id: post.id });
      
      if (result.data?.post) {
        setPostDetail(result.data.post);
      }
    } catch (err) {
      console.error('상세 정보 불러오기 중 오류:', err);
    } finally {
      setDetailLoading(false);
    }
  };
  
  return (
    <div className="post-card border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
      <p className="text-gray-600 mb-2">{post.content}</p>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">작성자: {post.author.name}</span>
        <div className="flex space-x-2">
          <button
            onClick={handleLike}
            className="px-3 py-1 bg-pink-100 text-pink-700 rounded-md hover:bg-pink-200 transition"
            disabled={loading}
          >
            {loading ? '처리 중...' : `좋아요 ${likes !== null ? `(${likes})` : ''}`}
          </button>
          <button
            onClick={handleViewDetail}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition"
          >
            {selectedPost === post.id ? '닫기' : '상세 보기'}
          </button>
        </div>
      </div>
      
      {selectedPost === post.id && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          {detailLoading ? (
            <div className="text-center py-2">상세 정보 로딩 중...</div>
          ) : postDetail ? (
            <div>
              <h4 className="font-semibold mb-2">{postDetail.title} - 상세 정보</h4>
              <p className="mb-2">{postDetail.content}</p>
              <div className="text-sm text-gray-600">
                <p>작성자: {postDetail.author.name}</p>
                <p>이메일: {postDetail.author.email}</p>
              </div>
              <CommentForm postId={post.id} />
            </div>
          ) : (
            <div className="text-red-500">상세 정보를 불러올 수 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

// 댓글 작성 폼 컴포넌트
function CommentForm({ postId }: { postId: string }) {
  const { client } = useGraphQL();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    try {
      setLoading(true);
      const mutation = `
        mutation addComment($postId: ID!, $text: String!) {
          addComment(postId: $postId, text: $text) {
            id
            text
          }
        }
      `;
      
      await client.mutate(mutation, { postId, text: comment });
      
      setComment('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('댓글 추가 중 오류:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="mb-2">
        <label htmlFor={`comment-${postId}`} className="block text-sm font-medium text-gray-700 mb-1">
          댓글 작성
        </label>
        <textarea
          id={`comment-${postId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={2}
          placeholder="댓글을 작성해주세요"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="px-4 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition disabled:opacity-50"
          disabled={loading || !comment.trim()}
        >
          {loading ? '제출 중...' : '댓글 작성'}
        </button>
        {success && <span className="text-green-500 text-sm">댓글이 추가되었습니다!</span>}
      </div>
    </form>
  );
}

// GraphQL 예제 헤더 컴포넌트
function GraphQLHeader() {
  return (
    <div className="bg-purple-700 text-white p-4 mb-6 rounded-lg">
      <h1 className="text-2xl font-bold mb-2">GraphQL 예제</h1>
      <p className="text-purple-100">
        이 예제는 클라이언트 측에서 GraphQL을 사용하는 방법을 보여줍니다.
        (실제 GraphQL 서버 없이 모의 구현을 사용합니다)
      </p>
    </div>
  );
}

// GraphQL 코드 샘플 컴포넌트
function GraphQLCodeSample() {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg mb-6 overflow-x-auto">
      <h3 className="text-lg font-semibold mb-2 text-purple-300">GraphQL 쿼리 예제</h3>
      <pre className="text-sm">
{`query getPosts {
  posts {
    id
    title
    content
    author {
      name
    }
  }
}

query getPost($id: ID!) {
  post(id: $id) {
    id
    title
    content
    author {
      name
      email
    }
  }
}

mutation likePost($id: ID!) {
  likePost(id: $id) {
    id
    likes
  }
}`}
      </pre>
    </div>
  );
}

// GraphQL 예제 컴포넌트
export function GraphQLExample() {
  return (
    <div className="graphql-example p-4 max-w-3xl mx-auto">
      <GraphQLHeader />
      
      <div className="mb-6">
        <p className="mb-4">
          GraphQL은 REST API의 대안으로, 클라이언트가 필요한 데이터만 요청할 수 있는 유연한 쿼리 언어입니다.
          이 예제에서는 포스트 목록 조회, 좋아요 기능, 댓글 작성 등의 기능을 GraphQL을 통해 구현하는 방법을 보여줍니다.
        </p>
        
        <GraphQLCodeSample />
      </div>
      
      <GraphQLContext.Provider value={{ client: mockGraphQLClient, loading: false }}>
        <PostList />
      </GraphQLContext.Provider>
    </div>
  );
}