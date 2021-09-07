<script lang="ts">
	import { interpret } from 'xstate';
	import { createModel } from 'xstate/lib/model';
	import { bootable } from '$lib/bootable';

	const model = createModel(
		{
			count: 0,
			anotherCount: 0
		},
		{
			events: {
				INCREMENT: () => ({}),
				INCREMENT_ANOTHER: () => ({})
			}
		}
	);

	const machine = model.createMachine({
		initial: 'idle',
		context: model.initialContext,
		states: {
			idle: {
				on: {
					INCREMENT: {
						actions: model.assign({ count: ({ count }) => count + 1 })
					},
					INCREMENT_ANOTHER: {
						actions: model.assign({
							anotherCount: ({ anotherCount }) => anotherCount + 1
						})
					}
				}
			}
		}
	});

	const { service, select, send, state, context } = bootable(machine);
	const withSelector = select((s) => s.context.count);
</script>

<button data-testid="count" on:click={() => send('INCREMENT')}>Increment count</button>
<button data-testid="another" on:click={() => send('INCREMENT_ANOTHER')}
	>Increment another count</button
>
<div data-testid="withSelector">{$withSelector}</div>
<div data-testid="withoutSelector">{$context.anotherCount}</div>
{JSON.stringify($state)}
