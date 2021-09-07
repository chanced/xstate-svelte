/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { readable, derived, get } from 'svelte/store';
import type { Readable } from 'svelte/store';
import type {
	EventObject,
	StateMachine,
	InterpreterOptions,
	MachineOptions,
	StateConfig,
	Typestate,
	Interpreter,
	StateSchema,
	SingleOrArray,
	Event,
	SCXML,
	EventData
} from 'xstate';
import { interpret, State } from 'xstate';

interface Options<TContext extends object, TEvent extends EventObject> {
	/**
	 * If provided, will be merged with machine's `context`.
	 */
	context: Partial<TContext>;
	/**
	 * The state to rehydrate the machine to. The machine will
	 * start at this state instead of its `initialState`.
	 */
	state: StateConfig<TContext, TEvent>;
}

export function bootable<
	TContext extends object,
	TEvent extends EventObject,
	TStateSchema extends StateSchema<any>,
	TTypestate extends Typestate<TContext>
>(
	machine: StateMachine<TContext, StateSchema, TEvent, TTypestate>,
	options: Partial<InterpreterOptions> &
		Partial<Options<TContext, TEvent>> &
		Partial<MachineOptions<TContext, TEvent>> = {}
) {
	console.log(options);
	const {
		context: initialContext,
		guards,
		actions,
		activities,
		services,
		delays,
		state: initialState,
		...interpreterOptions
	} = options;
	const machineConfig = {
		context: initialContext,
		guards,
		actions,
		activities,
		services,
		delays
	};
	let previousState: State<TContext, TEvent, StateSchema<any>, TTypestate> = undefined;
	const resolvedMachine = machine.withConfig(machineConfig, () => ({
		...machine.context,
		...initialContext
	}));

	const interpreter = interpret(resolvedMachine, interpreterOptions);

	const service = readable(interpreter, (set) => {
		set(interpreter.start(previousState ?? initialState ? new State(initialState) : undefined));
		return () => {
			previousState = interpreter.state;
			interpreter.stop();
		};
	});

	const state = derived<
		Readable<Interpreter<TContext, StateSchema<any>, TEvent, TTypestate>>,
		State<TContext, TEvent, any, TTypestate>
	>(service, ($service, set) => {
		const sub = $service.subscribe(($state) => {
			// if ($state.changed) {
			set($state);
			// }
		});
		return () => {
			sub.unsubscribe();
		};
	});

	const send = function (
		event: SingleOrArray<Event<TEvent>> | SCXML.Event<TEvent>,
		payload?: EventData | undefined
	): State<TContext, TEvent, TStateSchema, TTypestate> {
		let state: State<TContext, TEvent, TStateSchema, TTypestate>;
		service.subscribe(({ send }) => {
			state = send(event, payload);
		})();
		return state;
	};
	const select = function <T>(
		selector: (emitted: State<TContext, TEvent, TStateSchema, TTypestate>) => T,
		compare: (a: T, b: T) => boolean = defaultCompare
	): Readable<T> {
		const selected = readable<T>(selector(get(state)), (set) => {
			return state.subscribe(($state) => {
				const nextSelected = selector($state);
				if (!compare(get(selected), nextSelected)) {
					set(nextSelected);
				}
			});
		});
		return selected;
	};

	const context = derived(state, ($state) => $state.context);

	const defaultCompare = (a, b) => a === b;

	return { state, send, service, select, context };
}

export type Bootable = ReturnType<typeof bootable>;