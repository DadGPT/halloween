import { motion, AnimatePresence } from 'framer-motion'

export default function Toast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-black/90 text-white py-3 px-6 rounded-full border-2 border-orange-500 opacity-0 z-[600] max-w-[80%] text-center pointer-events-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}