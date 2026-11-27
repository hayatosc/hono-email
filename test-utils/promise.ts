export function rejection(promise: PromiseLike<unknown>): Promise<unknown> {
  return Promise.resolve(promise).then(
    () => {
      throw new Error('Expected the promise to reject, but it resolved.')
    },
    (error: unknown) => error,
  )
}

export async function throwingRejection(promise: PromiseLike<unknown>): Promise<() => never> {
  const error = await rejection(promise)
  return () => {
    throw error
  }
}
