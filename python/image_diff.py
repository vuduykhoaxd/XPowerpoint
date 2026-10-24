import sys
import json
import os
from PIL import Image, ImageChops

def main():
    try:
        input_data = json.load(sys.stdin)
        a_path = input_data.get('a')
        b_path = input_data.get('b')

        if not os.path.exists(a_path) or not os.path.exists(b_path):
            print(json.dumps({'ok': False, 'message': 'Image missing'}))
            return

        img_a = Image.open(a_path).convert('RGB')
        img_b = Image.open(b_path).convert('RGB')
        
        if img_a.size != img_b.size:
            img_b = img_b.resize(img_a.size)
            
        diff = ImageChops.difference(img_a, img_b)
        
        # Calculate percentage
        stat = diff.getbbox()
        if stat is None:
            print(json.dumps({'ok': True, 'diffPercent': 0}))
        else:
            # More accurate diff percentage
            # Sum of absolute differences
            import numpy as np
            diff_arr = np.array(diff)
            percent = (np.sum(diff_arr) / (img_a.size[0] * img_a.size[1] * 3 * 255)) * 100
            print(json.dumps({'ok': True, 'diffPercent': float(percent)}))

    except Exception as e:
        print(json.dumps({'ok': False, 'message': str(e)}))

if __name__ == '__main__':
    main()
