export function prevent<HandlerFn extends Function>(
  eventHandler: HandlerFn,
    ...args: unknown[]
  ) {
  return <Ev extends Event>(event: Ev) => {
    eventHandler(event, ...args);
    event.preventDefault();
  };
}
