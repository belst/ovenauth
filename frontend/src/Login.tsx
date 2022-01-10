import { Component, createSignal, Show } from "solid-js";
import { useService } from "solid-services";
import { AuthService } from "./store/AuthService";
import { prevent } from "./utils/preventDefault";



const Login: Component = () => {
  const [errors, setErrors] = createSignal<Error | Record<string, string[]>>();
  const authService = useService(AuthService);


  const submit = (e) => {
    const data = new FormData(e.currentTarget);
    const body = Object.fromEntries(data) as any;

    authService().login(body).catch(setErrors);
  }

  return (
    <>
      <form onSubmit={prevent(submit)}>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Username</span>
          </label> 
          <input type="text" name="username" placeholder="Username" class="input input-bordered" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Password</span>
          </label> 
          <input type="password" name="password" placeholder="Password" class="input input-bordered" />
        </div>
        <input type="submit" class="float-right btn btn-primary" value="Login" />
      </form>
      <Show when={authService().user}>
        {(user) => <div>{JSON.stringify(user)}</div>}
      </Show>
      <Show when={errors()}>
        {(errors) => <div>{JSON.stringify(errors)}</div>}
      </Show>
    </>
  );
};

export default Login;
