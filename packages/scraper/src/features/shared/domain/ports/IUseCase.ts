export interface IUseCase<TInput, TOutput> {
  execute(input: TInput, signal?: AbortSignal): Promise<TOutput>;
}
