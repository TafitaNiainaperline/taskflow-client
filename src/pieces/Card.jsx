import '../styles/card.scss'

function Card({ children, className = '', variant = 'default', ...props }) {
  return (
    <div className={`card card-${variant} ${className}`} {...props}>
      {children}
    </div>
  )
}

export default Card
