import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    const token = localStorage.getItem('accessToken')
    socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    socket.on('connect', () => console.log('🔌 Socket connected'))
    socket.on('disconnect', () => console.log('🔌 Socket disconnected'))
    socket.on('connect_error', (err) => console.warn('Socket error:', err.message))
  }
  return socket
}

export const disconnectSocket = () => {
  socket?.disconnect()
  socket = null
}

export const updateSocketToken = () => {
  disconnectSocket()
  getSocket() // reconnects with new token
}
