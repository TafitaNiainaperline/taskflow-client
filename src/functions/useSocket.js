import { useEffect, useState } from 'react'
import io from 'socket.io-client'

const SOCKET_URL = 'http://localhost:3000'

export const useSocket = () => {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id)
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    setSocket(newSocket)

    return () => newSocket.close()
  }, [])

  return socket
}

export const useSocketEvent = (socket, event, callback) => {
  useEffect(() => {
    if (!socket) return

    socket.on(event, callback)

    return () => {
      socket.off(event, callback)
    }
  }, [socket, event, callback])
}

export const useSocketEmit = (socket) => {
  return (event, data) => {
    if (socket) {
      socket.emit(event, data)
    }
  }
}
