import AuthForm from '../components/AuthForm'
import { login } from '../api'

export default function Signin() {
  return <AuthForm mode="signin" onSubmit={login} />
}
