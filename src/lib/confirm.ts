import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export const confirmAction = async ({
  title = 'Are you sure?',
  text = "You won't be able to revert this!",
  icon = 'warning' as 'warning' | 'error' | 'success' | 'info' | 'question',
  confirmButtonText = 'Yes, proceed',
  cancelButtonText = 'Cancel',
  dangerMode = false
}) => {
  const result = await MySwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonColor: dangerMode ? '#ef4444' : '#4f46e5', // red-500 vs indigo-600
    cancelButtonColor: '#9ca3af', // gray-400
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    background: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827',
  });

  return result.isConfirmed;
};

export const showError = async (title: string, text?: string) => {
  await MySwal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#4f46e5',
    background: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827',
  });
};

export const showSuccess = async (title: string, text?: string) => {
  await MySwal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#4f46e5',
    background: document.documentElement.classList.contains('dark') ? '#111827' : '#ffffff',
    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827',
  });
};

export default confirmAction;
