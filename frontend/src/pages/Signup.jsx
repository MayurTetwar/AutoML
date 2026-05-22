import AuthForm from '../components/AuthForm'
import { signup } from '../api'

export default function Signup() {
  return <AuthForm mode="signup" onSubmit={signup} />
}
