declare module "lakebed/client" {
  export interface AuthState {
    userId: string;
    displayName: string;
    isGuest: boolean;
    picture?: string;
    isLoading: boolean;
  }

  export function useAuth(): AuthState;

  export function useQuery<T>(name: string): T | undefined;

  export function useMutation<TArgs extends unknown[], TResult>(name: string): (...args: TArgs) => Promise<TResult>;

  export function SignInWithGoogle(props: { className?: string }): any;

  export function signOut(): Promise<void>;
}
