import type {
  CheckboxStep,
  ConfirmStep,
  EditorStep,
  ExpandStep,
  NumberStep,
  PasswordStep,
  RawlistStep,
  SearchStep,
  SelectStep,
  Step,
  TextStep,
} from './types.js';

type Builder<S extends Step> = (config: Omit<S, 'type'>) => S;

const builder =
  <S extends Step>(type: S['type']): Builder<S> =>
  (config) =>
    ({ ...config, type }) as S;

export const text = builder<TextStep>('text');
export const password = builder<PasswordStep>('password');
export const number = builder<NumberStep>('number');
export const confirm = builder<ConfirmStep>('confirm');
export const editor = builder<EditorStep>('editor');
export const select = builder<SelectStep>('select');
export const rawlist = builder<RawlistStep>('rawlist');
export const checkbox = builder<CheckboxStep>('checkbox');
export const expand = builder<ExpandStep>('expand');
export const search = builder<SearchStep>('search');
