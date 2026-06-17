export type ActionState = {
  ok: boolean;
  message: string;
  href?: string;
};

export const initialActionState: ActionState = {
  ok: false,
  message: "",
};
