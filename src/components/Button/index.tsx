
import { ButtonProps } from "./Button.interface";

function NativeButton(props: any) {
  const local = props;
  return <button class={"native-button " + (local.class || "")} {...props}>{local.children}</button>;
}


export default function Button(props: ButtonProps) {
  return <NativeButton {...props}>{props.children}</NativeButton>;
}
