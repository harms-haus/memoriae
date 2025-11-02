// Entry point for the backend server
import app from './app'
import { config } from './config'

const PORT = config.port

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`API available at http://localhost:${PORT}/api`)
})
